import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import type { ColorSettings } from '@/types/painting'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })
  }

  const body = await request.json()
  const { publicId, colorSettings } = body as { publicId: string; colorSettings: ColorSettings }

  if (!publicId) {
    return NextResponse.json({ error: 'Saknar publicId' }, { status: 400 })
  }

  const context: Record<string, string> = {
    color_vibrance: String(colorSettings.vibrance),
    color_improve: colorSettings.improve,
    color_sharpen: String(colorSettings.sharpen),
    color_brightness: String(colorSettings.brightness),
  }

  try {
    await cloudinary.api.update(publicId, { context })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('save-color error:', err)
    return NextResponse.json({ error: 'Misslyckades att spara' }, { status: 500 })
  }
}
