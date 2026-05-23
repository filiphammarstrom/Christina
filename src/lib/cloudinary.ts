import { v2 as cloudinary } from 'cloudinary'
import type { GalleryPainting } from '@/types/painting'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

interface CloudinaryContext {
  title?: string
  price?: string
  dimensions?: string
  technique?: string
  available?: string
  year?: string
}

function toGalleryPainting(r: Record<string, unknown>): GalleryPainting {
  const ctx = ((r.context as Record<string, unknown>)?.custom ?? {}) as CloudinaryContext

  const rawPrice = ctx.price?.replace(/\D/g, '')
  const price = rawPrice ? parseInt(rawPrice, 10) : undefined

  const rawYear = ctx.year ? parseInt(ctx.year, 10) : undefined
  const year = rawYear && !isNaN(rawYear) ? rawYear : undefined

  const availableRaw = ctx.available?.toLowerCase()
  const available = availableRaw !== 'nej' && availableRaw !== 'no' && availableRaw !== 'false'

  const publicId = r.public_id as string

  return {
    id: publicId,
    publicId,
    thumbnailUrl: cloudinary.url(publicId, {
      width: 900,
      crop: 'limit',
      quality: 'auto',
      fetch_format: 'auto',
      effect: 'improve',
      secure: true,
    }),
    fullUrl: cloudinary.url(publicId, {
      width: 1800,
      crop: 'limit',
      quality: 'auto',
      fetch_format: 'auto',
      effect: 'improve',
      secure: true,
    }),
    title: ctx.title || undefined,
    year,
    dimensions: ctx.dimensions || undefined,
    technique: ctx.technique || 'Olja på pannå',
    price: price && !isNaN(price) ? price : undefined,
    available,
    featured: false,
  }
}

export async function fetchAllPaintings(): Promise<GalleryPainting[]> {
  // Try with folder prefix first, fall back to all images
  let resources: Record<string, unknown>[] = []

  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'paintings',
      max_results: 500,
      resource_type: 'image',
      context: true,
    })
    resources = result.resources as Record<string, unknown>[]
    console.log(`Cloudinary: hittade ${resources.length} bilder med prefix "paintings"`)
  } catch (err) {
    console.error('Cloudinary prefix-sökning misslyckades:', err)
  }

  // If prefix returned nothing, try fetching all images (covers root-level uploads)
  if (resources.length === 0) {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        max_results: 500,
        resource_type: 'image',
        context: true,
      })
      resources = result.resources as Record<string, unknown>[]
      console.log(`Cloudinary: hittade ${resources.length} bilder totalt (utan prefix)`)
    } catch (err) {
      console.error('Cloudinary root-sökning misslyckades:', err)
    }
  }

  return resources.map(toGalleryPainting)
}
