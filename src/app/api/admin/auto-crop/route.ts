import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: Request) {
  const token = cookies().get('admin_token')?.value
  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })
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

  const prompt = `This is a photo of a painting taken with a phone. It may show the painting on an easel or against a wall, with a visible frame, and possibly tilted or at an angle (perspective distortion).

Find the FOUR CORNERS of the PAINTED CANVAS — just inside the inner edge of any visible frame, excluding easel, wall, floor, or background.

If the painting is photographed at an angle (so it appears trapezoidal), mark the actual corners of the painting surface as they appear in the photo — not a simple bounding box. This enables full perspective correction.

Label corners by their position ON THE PAINTING ITSELF:
- tl = top-left of the painting
- tr = top-right of the painting
- br = bottom-right of the painting
- bl = bottom-left of the painting

The image is ${fetchedWidth} × ${fetchedHeight} pixels.

Return ONLY valid JSON, no explanation, no markdown fences:
{"tl":{"x":N,"y":N},"tr":{"x":N,"y":N},"br":{"x":N,"y":N},"bl":{"x":N,"y":N}}`

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
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
    const upscale = (originalWidth ?? fetchedWidth) / fetchedWidth

    const corners = {
      tl: { x: Math.round(raw.tl.x * upscale), y: Math.round(raw.tl.y * upscale) },
      tr: { x: Math.round(raw.tr.x * upscale), y: Math.round(raw.tr.y * upscale) },
      br: { x: Math.round(raw.br.x * upscale), y: Math.round(raw.br.y * upscale) },
      bl: { x: Math.round(raw.bl.x * upscale), y: Math.round(raw.bl.y * upscale) },
    }

    return NextResponse.json(corners)
  } catch (err) {
    console.error('auto-crop: fel:', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `AI-analys misslyckades: ${message}` }, { status: 500 })
  }
}
