import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const token = cookies().get('admin_token')?.value
  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })
  }

  const { publicId, originalWidth, originalHeight } = await request.json()
  if (!publicId) {
    return NextResponse.json({ error: 'Saknar publicId' }, { status: 400 })
  }

  // Fetch a manageable version of the original (no enhancements applied)
  const imageUrl = cloudinary.url(publicId, {
    transformation: [{ width: 1200, crop: 'limit', quality: 85, fetch_format: 'jpg' }],
    secure: true,
  })

  let base64Image: string
  let fetchedWidth: number
  let fetchedHeight: number

  try {
    const res = await fetch(imageUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer = await res.arrayBuffer()
    base64Image = Buffer.from(buffer).toString('base64')

    const scale = Math.min(1200 / (originalWidth ?? 1200), 1)
    fetchedWidth = Math.round((originalWidth ?? 1200) * scale)
    fetchedHeight = Math.round((originalHeight ?? 900) * scale)
  } catch (err) {
    console.error('auto-crop: failed to fetch image', err)
    return NextResponse.json({ error: 'Kunde inte hämta bilden' }, { status: 500 })
  }

  const prompt = `This is a photo of a painting taken with a phone. The painting may be on an easel, leaning against a wall, or photographed at an angle, with a visible wooden frame, and possibly with room/floor/background visible. The photo may also be slightly or significantly tilted.

Find the FOUR CORNERS of the PAINTED CANVAS — ideally just inside the inner edge of any visible frame, excluding all easel, wall, floor, or other background.

If the painting is photographed at an angle (perspective distortion — e.g. the top looks narrower than the bottom), mark the actual corners of the painting surface as it appears in the photo, not a simple bounding box. This allows perspective correction.

Label the corners by their position ON THE PAINTING ITSELF (not on the photo):
- tl = top-left corner of the painting
- tr = top-right corner of the painting
- br = bottom-right corner of the painting
- bl = bottom-left corner of the painting

The image is ${fetchedWidth} × ${fetchedHeight} pixels.

Return ONLY valid JSON, no explanation, no markdown:
{"tl":{"x":N,"y":N},"tr":{"x":N,"y":N},"br":{"x":N,"y":N},"bl":{"x":N,"y":N}}`

  let rawCorners: { tl: { x: number; y: number }; tr: { x: number; y: number }; br: { x: number; y: number }; bl: { x: number; y: number } }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    rawCorners = JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('auto-crop: Claude error', err)
    return NextResponse.json({ error: 'AI-analys misslyckades' }, { status: 500 })
  }

  // Scale coordinates back up to original image dimensions
  const scale = (originalWidth ?? fetchedWidth) / fetchedWidth
  const corners = {
    tl: { x: Math.round(rawCorners.tl.x * scale), y: Math.round(rawCorners.tl.y * scale) },
    tr: { x: Math.round(rawCorners.tr.x * scale), y: Math.round(rawCorners.tr.y * scale) },
    br: { x: Math.round(rawCorners.br.x * scale), y: Math.round(rawCorners.br.y * scale) },
    bl: { x: Math.round(rawCorners.bl.x * scale), y: Math.round(rawCorners.bl.y * scale) },
  }

  return NextResponse.json(corners)
}
