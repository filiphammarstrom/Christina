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

  const prompt = `You are analyzing a phone photo of an oil painting on a canvas or wooden panel.

The photo may show: the painted surface, a wooden or decorative frame, an easel, a wall, floor, or background.

Your job: locate the 4 EXACT CORNERS of the PAINTED CANVAS — the inner edge of the frame where paint begins, or the edge of the canvas/panel itself if unframed.

IMPORTANT RULES:
- Be TIGHT: corners should be right at the edge of the painted area, not a safe margin inside
- The painting may be slightly tilted or photographed at an angle — place corners exactly where they physically are, even if the resulting shape is a trapezoid or parallelogram
- If framed: find the INNER edge of the frame (where paint starts), NOT the outer edge of the frame
- If unframed: find the actual canvas/panel edge

Image: ${fetchedWidth} × ${fetchedHeight} pixels.
Return corner positions as PERCENTAGES (0–100) of image width (x) and height (y).

Examples:
Painting fills most of frame, slightly tilted: {"tl":{"x":7,"y":5},"tr":{"x":94,"y":6},"br":{"x":93,"y":94},"bl":{"x":8,"y":95}}
Painting on easel, visible background, slight perspective: {"tl":{"x":18,"y":12},"tr":{"x":83,"y":10},"br":{"x":85,"y":90},"bl":{"x":16,"y":92}}
Painting at angle (photographed from the side): {"tl":{"x":10,"y":8},"tr":{"x":88,"y":14},"br":{"x":86,"y":93},"bl":{"x":12,"y":87}}

Return ONLY valid JSON, no explanation:
{"tl":{"x":N,"y":N},"tr":{"x":N,"y":N},"br":{"x":N,"y":N},"bl":{"x":N,"y":N}}`

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

    const W = originalWidth ?? fetchedWidth
    const H = originalHeight ?? fetchedHeight

    // Support both new 4-corner format and legacy bounding-box format
    let corners
    if (raw.tl && raw.tr && raw.br && raw.bl) {
      corners = {
        tl: { x: Math.round(raw.tl.x / 100 * W), y: Math.round(raw.tl.y / 100 * H) },
        tr: { x: Math.round(raw.tr.x / 100 * W), y: Math.round(raw.tr.y / 100 * H) },
        br: { x: Math.round(raw.br.x / 100 * W), y: Math.round(raw.br.y / 100 * H) },
        bl: { x: Math.round(raw.bl.x / 100 * W), y: Math.round(raw.bl.y / 100 * H) },
      }
    } else {
      // Legacy fallback: {left, top, right, bottom}
      const left   = Math.round((raw.left   ?? 5)  / 100 * W)
      const top    = Math.round((raw.top    ?? 5)  / 100 * H)
      const right  = Math.round((raw.right  ?? 95) / 100 * W)
      const bottom = Math.round((raw.bottom ?? 95) / 100 * H)
      corners = {
        tl: { x: left, y: top }, tr: { x: right, y: top },
        br: { x: right, y: bottom }, bl: { x: left, y: bottom },
      }
    }

    return NextResponse.json(corners)
  } catch (err) {
    console.error('auto-crop: fel:', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `AI-analys misslyckades: ${message}` }, { status: 500 })
  }
}
