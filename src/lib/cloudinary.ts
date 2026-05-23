import { v2 as cloudinary } from 'cloudinary'
import type { GalleryPainting, Crop, Corners } from '@/types/painting'

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
  // Simple crop + rotation (legacy)
  crop_x?: string
  crop_y?: string
  crop_w?: string
  crop_h?: string
  crop_rotation?: string
  // Four-corner perspective correction
  corner_tl_x?: string; corner_tl_y?: string
  corner_tr_x?: string; corner_tr_y?: string
  corner_br_x?: string; corner_br_y?: string
  corner_bl_x?: string; corner_bl_y?: string
}

function buildUrls(
  publicId: string,
  crop?: Crop,
  corners?: Corners,
): { thumbnailUrl: string; fullUrl: string } {
  const perspectiveTransform: object[] = []

  if (corners) {
    const { tl, tr, br, bl } = corners
    perspectiveTransform.push({
      effect: `distort:${tl.x}:${tl.y}:${tr.x}:${tr.y}:${br.x}:${br.y}:${bl.x}:${bl.y}`,
    })
  } else if (crop) {
    perspectiveTransform.push({
      crop: 'crop',
      x: Math.round(crop.x),
      y: Math.round(crop.y),
      width: Math.round(crop.w),
      height: Math.round(crop.h),
    })
    if (crop.rotation) {
      perspectiveTransform.push({ angle: Math.round(crop.rotation) })
    }
  }

  const enhance = [
    { effect: 'improve:indoor' },
    { effect: 'vibrance:60' },
    { effect: 'sharpen:80' },
  ]

  const thumbnailUrl = cloudinary.url(publicId, {
    transformation: [
      ...perspectiveTransform,
      ...enhance,
      { width: 900, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
    ],
    secure: true,
  })

  const fullUrl = cloudinary.url(publicId, {
    transformation: [
      ...perspectiveTransform,
      ...enhance,
      { width: 1800, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
    ],
    secure: true,
  })

  return { thumbnailUrl, fullUrl }
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

  const corners: Corners | undefined =
    ctx.corner_tl_x && ctx.corner_tl_y &&
    ctx.corner_tr_x && ctx.corner_tr_y &&
    ctx.corner_br_x && ctx.corner_br_y &&
    ctx.corner_bl_x && ctx.corner_bl_y
      ? {
          tl: { x: parseFloat(ctx.corner_tl_x), y: parseFloat(ctx.corner_tl_y) },
          tr: { x: parseFloat(ctx.corner_tr_x), y: parseFloat(ctx.corner_tr_y) },
          br: { x: parseFloat(ctx.corner_br_x), y: parseFloat(ctx.corner_br_y) },
          bl: { x: parseFloat(ctx.corner_bl_x), y: parseFloat(ctx.corner_bl_y) },
        }
      : undefined

  const crop: Crop | undefined =
    !corners && ctx.crop_x && ctx.crop_y && ctx.crop_w && ctx.crop_h
      ? {
          x: parseFloat(ctx.crop_x),
          y: parseFloat(ctx.crop_y),
          w: parseFloat(ctx.crop_w),
          h: parseFloat(ctx.crop_h),
          rotation: ctx.crop_rotation ? parseFloat(ctx.crop_rotation) : undefined,
        }
      : undefined

  const { thumbnailUrl, fullUrl } = buildUrls(publicId, crop, corners)

  return {
    id: publicId,
    publicId,
    thumbnailUrl,
    fullUrl,
    title: ctx.title || undefined,
    year,
    dimensions: ctx.dimensions || undefined,
    technique: ctx.technique || 'Olja på pannå',
    price: price && !isNaN(price) ? price : undefined,
    available,
    featured: false,
    crop,
    corners,
    originalWidth: r.width as number,
    originalHeight: r.height as number,
  }
}

export async function fetchAllPaintings(): Promise<GalleryPainting[]> {
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
    console.log(`Cloudinary: ${resources.length} bilder med prefix "paintings"`)
  } catch (err) {
    console.error('Cloudinary prefix-sökning misslyckades:', err)
  }

  if (resources.length === 0) {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        max_results: 500,
        resource_type: 'image',
        context: true,
      })
      resources = result.resources as Record<string, unknown>[]
      console.log(`Cloudinary: ${resources.length} bilder totalt (utan prefix)`)
    } catch (err) {
      console.error('Cloudinary root-sökning misslyckades:', err)
    }
  }

  return resources.map(toGalleryPainting)
}
