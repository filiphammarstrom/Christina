import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { cookies } from 'next/headers'
import type { Corners } from '@/types/painting'

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

  const body = await request.json()
  const { publicId } = body

  if (!publicId) {
    return NextResponse.json({ error: 'Saknar publicId' }, { status: 400 })
  }

  const context: Record<string, string> = {}

  if (body.corners) {
    const c = body.corners as Corners
    context.corner_tl_x = String(Math.round(c.tl.x))
    context.corner_tl_y = String(Math.round(c.tl.y))
    context.corner_tr_x = String(Math.round(c.tr.x))
    context.corner_tr_y = String(Math.round(c.tr.y))
    context.corner_br_x = String(Math.round(c.br.x))
    context.corner_br_y = String(Math.round(c.br.y))
    context.corner_bl_x = String(Math.round(c.bl.x))
    context.corner_bl_y = String(Math.round(c.bl.y))
    // Clear old-style crop fields
    context.crop_x = ''
    context.crop_y = ''
    context.crop_w = ''
    context.crop_h = ''
    context.crop_rotation = ''
  } else {
    // Legacy simple crop
    const { x, y, w, h, rotation } = body
    if (x == null || y == null || w == null || h == null) {
      return NextResponse.json({ error: 'Saknar crop-parametrar' }, { status: 400 })
    }
    context.crop_x = String(Math.round(x))
    context.crop_y = String(Math.round(y))
    context.crop_w = String(Math.round(w))
    context.crop_h = String(Math.round(h))
    context.crop_rotation = rotation && rotation !== 0 ? String(rotation) : ''
  }

  try {
    await cloudinary.api.update(publicId, { context })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('save-crop error:', err)
    return NextResponse.json({ error: 'Misslyckades att spara' }, { status: 500 })
  }
}
