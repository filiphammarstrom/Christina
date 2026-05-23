import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export interface CloudinaryPainting {
  publicId: string
  thumbnailUrl: string
  fullUrl: string
}

export async function fetchAllPaintings(): Promise<CloudinaryPainting[]> {
  const result = await cloudinary.api.resources({
    type: 'upload',
    prefix: 'paintings',
    max_results: 500,
    resource_type: 'image',
  })

  return (result.resources as { public_id: string }[])
    .map(r => ({
      publicId: r.public_id,
      thumbnailUrl: cloudinary.url(r.public_id, {
        width: 900,
        crop: 'limit',
        quality: 'auto',
        fetch_format: 'auto',
        effect: 'improve',
        secure: true,
      }),
      fullUrl: cloudinary.url(r.public_id, {
        width: 1800,
        crop: 'limit',
        quality: 'auto',
        fetch_format: 'auto',
        effect: 'improve',
        secure: true,
      }),
    }))
}
