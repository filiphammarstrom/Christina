import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { cookies } from 'next/headers'
import sharp from 'sharp'

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

  // Download original (without any transformations)
  const originalUrl = cloudinary.url(publicId, {
    version: Math.round(Date.now() / 1000),
    secure: true,
    transformation: [],
  })

  const imageRes = await fetch(originalUrl)
  if (!imageRes.ok) throw new Error('Kunde inte hämta bild')
  const buffer = Buffer.from(await imageRes.arrayBuffer())

  // Process with Sharp:
  // 1. normalize() — auto-levels, fixes dark/grayish images
  // 2. modulate — boosts brightness and saturation
  // 3. sharpen — sharpens blurry iPhone photos
  // 4. trim — removes uniform borders (wall, floor, frame edges)
  const processed = await sharp(buffer)
    .rotate()                        // honour EXIF orientation
    .normalize()                     // auto-levels
    .modulate({ brightness: 1.08, saturation: 1.35 })
    .sharpen({ sigma: 1.2 })
    .trim({ background: 'auto', threshold: 30 })  // crop out uniform borders
    .jpeg({ quality: 92, progressive: true })
    .toBuffer()

  // Re-upload to Cloudinary, overwriting the original
  const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, overwrite: true, invalidate: true },
      (err, result) => {
        if (err || !result) reject(err)
        else resolve(result as { secure_url: string })
      }
    )
    stream.end(processed)
  })

  return NextResponse.json({ ok: true, url: uploadResult.secure_url })
}
