import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { cookies } from 'next/headers'

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

  const { publicId, x, y, w, h, rotation } = await request.json()

  if (!publicId || x == null || y == null || w == null || h == null) {
    return NextResponse.json({ error: 'Saknar parametrar' }, { status: 400 })
  }

  const context: Record<string, string> = {
    crop_x: String(Math.round(x)),
    crop_y: String(Math.round(y)),
    crop_w: String(Math.round(w)),
    crop_h: String(Math.round(h)),
  }

  if (rotation && rotation !== 0) {
    context.crop_rotation = String(rotation)
  } else {
    // Clear any existing rotation
    context.crop_rotation = ''
  }

  try {
    await cloudinary.api.update(publicId, { context })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('save-crop error:', err)
    return NextResponse.json({ error: 'Misslyckades att spara' }, { status: 500 })
  }
}
