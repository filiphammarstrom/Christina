import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

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

  const { publicId, title, price, dimensions, technique, available, year } = await request.json()

  const context: Record<string, string> = {}
  if (title) context.title = title
  if (price) context.price = String(price)
  if (dimensions) context.dimensions = dimensions
  if (technique) context.technique = technique
  if (year) context.year = String(year)
  context.available = available ? 'ja' : 'nej'

  await cloudinary.api.update(publicId, { context })

  return NextResponse.json({ ok: true })
}
