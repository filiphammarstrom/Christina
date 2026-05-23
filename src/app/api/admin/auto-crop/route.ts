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

  // Fetch a reasonably-sized version of the original image (no enhancements)
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

    // The fetched image is scaled down — figure out actual fetched dimensions
    // by capping originalWidth at 1200 and scaling proportionally
    const scale = Math.min(1200 / (originalWidth ?? 1200), 1)
    fetchedWidth = Math.round((originalWidth ?? 1200) * scale)
    fetchedHeight = Math.round((originalHeight ?? 900) * scale)
  } catch (err) {
    console.error('auto-crop: failed to fetch image', err)
    return NextResponse.json({ error: 'Kunde inte hämta bilden' }, { status: 500 })
  }

  const prompt = `This is a photo of a painting. The photo was taken with a phone and may show the painting on an easel, leaning against a wall, or with visible frame, floor, room, or background.

Your task: identify the rectangular region containing ONLY the painted canvas — ideally just inside or at the inner edge of any frame, and excluding any easel, wall, floor, or surroundings.

Also detect if the painting is slightly tilted and report the degrees needed to straighten it (positive = rotate clockwise, negative = counterclockwise).

The fetched image is ${fetchedWidth} × ${fetchedHeight} pixels. Return ONLY valid JSON, no explanation:
{"x": <pixels from left>, "y": <pixels from top>, "w": <width px>, "h": <height px>, "rotation": <degrees, 0 if already straight>}`

  let cropData: { x: number; y: number; w: number; h: number; rotation: number }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
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
    cropData = JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('auto-crop: Claude error', err)
    return NextResponse.json({ error: 'AI-analys misslyckades' }, { status: 500 })
  }

  // Scale crop coords back up to original image dimensions
  const scale = (originalWidth ?? fetchedWidth) / fetchedWidth
  const result = {
    x: Math.round(cropData.x * scale),
    y: Math.round(cropData.y * scale),
    w: Math.round(cropData.w * scale),
    h: Math.round(cropData.h * scale),
    rotation: Math.round(cropData.rotation * 2) / 2, // round to nearest 0.5°
  }

  return NextResponse.json(result)
}
