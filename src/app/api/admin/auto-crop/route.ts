import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import Anthropic from '@anthropic-ai/sdk'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Ej behörig — logga ut och in igen' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('auto-crop: ANTHROPIC_API_KEY saknas')
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY saknas i miljövariabler' }, { status: 500 })
  }

  const { publicId, originalWidth, originalHeight } = await request.json()
  if (!publicId) {
    return NextResponse.json({ error: 'Saknar publicId' }, { status: 400 })
  }

  // Use a Cloudinary URL directly — no need to fetch/buffer/base64
  const imageUrl = cloudinary.url(publicId, {
    transformation: [{ width: 1200, crop: 'limit', quality: 80, fetch_format: 'jpg' }],
    secure: true,
  })

  const scale = Math.min(1200 / (originalWidth ?? 1200), 1)
  const fetchedWidth = Math.round((originalWidth ?? 1200) * scale)
  const fetchedHeight = Math.round((originalHeight ?? 900) * scale)

  const prompt = `You are analyzing a phone photo of an oil painting.

The photo may show: the painted canvas, a wooden frame, an easel, a wall, floor, or room background.

Your job: find the bounding box of just the PAINTED CANVAS (the part with paint on it, just inside any frame).

Express it as PERCENTAGES of the image dimensions (0 = left/top edge, 100 = right/bottom edge).

Image: ${fetchedWidth} × ${fetchedHeight} pixels.

Examples of typical answers:
- Painting fills most of frame: {"left":5,"top":5,"right":95,"bottom":95}
- Painting in center with easel/background visible: {"left":15,"top":10,"right":85,"bottom":90}
- Painting offset to one side: {"left":20,"top":8,"right":92,"bottom":88}

Return ONLY valid JSON, no explanation:
{"left":N,"top":N,"right":N,"bottom":N}`

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: imageUrl },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    console.log('auto-crop response:', text)

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('auto-crop: inget JSON i svar:', text)
      return NextResponse.json({ error: 'Oväntat svar från AI' }, { status: 500 })
    }

    const raw = JSON.parse(jsonMatch[0])

    // Convert percentages → pixel coordinates in the original image
    const W = originalWidth ?? fetchedWidth
    const H = originalHeight ?? fetchedHeight
    const left  = Math.round(raw.left  / 100 * W)
    const top   = Math.round(raw.top   / 100 * H)
    const right = Math.round(raw.right / 100 * W)
    const bottom = Math.round(raw.bottom / 100 * H)

    const corners = {
      tl: { x: left,  y: top    },
      tr: { x: right, y: top    },
      br: { x: right, y: bottom },
      bl: { x: left,  y: bottom },
    }

    return NextResponse.json(corners)
  } catch (err) {
    console.error('auto-crop: fel:', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `AI-analys misslyckades: ${message}` }, { status: 500 })
  }
}
