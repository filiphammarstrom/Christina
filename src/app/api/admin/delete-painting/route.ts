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

  const { publicId } = await request.json()
  await cloudinary.uploader.destroy(publicId)

  return NextResponse.json({ ok: true })
}
