import { v2 as cloudinary } from 'cloudinary'
import type { GalleryPainting, Crop, Corners, ColorSettings } from '@/types/painting'

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
  // Per-image color settings
  color_vibrance?: string
  color_improve?: string
  color_sharpen?: string
  color_brightness?: string
}

function buildEnhance(cs?: ColorSettings): object[] {
  const vibrance = cs?.vibrance ?? 60
  const improve = cs?.improve ?? 'indoor'
  const sharpen = cs?.sharpen ?? 80
  const brightness = cs?.brightness ?? 0
  const fx: object[] = []
  if (improve !== 'none') fx.push({ effect: `improve:${improve}` })
  if (vibrance > 0) fx.push({ effect: `vibrance:${vibrance}` })
  if (sharpen > 0) fx.push({ effect: `sharpen:${sharpen}` })
  if (brightness !== 0) fx.push({ effect: `brightness:${brightness}` })
  return fx
}

function buildUrls(
  publicId: string,
  crop?: Crop,
  corners?: Corners,
  colorSettings?: ColorSettings,
): { thumbnailUrl: string; fullUrl: string; originalUrl: string } {
  const perspectiveTransform: object[] = []

  if (corners) {
    const { tl, tr, br, bl } = corners
    // Natural output size: average of opposite quad edge lengths
    const outW = Math.round(
      (Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(br.x - bl.x, br.y - bl.y)) / 2
    )
    const outH = Math.round(
      (Math.hypot(bl.x - tl.x, bl.y - tl.y) + Math.hypot(br.x - tr.x, br.y - tr.y)) / 2
    )
    // e_distort maps source quad corners → output rectangle corners (perspective correction)
    perspectiveTransform.push({
      effect: `distort:${Math.round(tl.x)}:${Math.round(tl.y)}:${Math.round(tr.x)}:${Math.round(tr.y)}:${Math.round(br.x)}:${Math.round(br.y)}:${Math.round(bl.x)}:${Math.round(bl.y)}`,
      width: outW,
      height: outH,
      crop: 'crop',
    })
    if (corners.rotation) {
      perspectiveTransform.push({ angle: Math.round(corners.rotation) })
    }
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

  const enhance = buildEnhance(colorSettings)

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

  // Original image without any crop or colour transforms — used by CropModal
  const originalUrl = cloudinary.url(publicId, {
    transformation: [{ width: 1600, crop: 'limit', quality: 85, fetch_format: 'jpg' }],
    secure: true,
  })

  return { thumbnailUrl, fullUrl, originalUrl }
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
          rotation: ctx.crop_rotation ? parseFloat(ctx.crop_rotation) : undefined,
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

  const colorSettings: ColorSettings | undefined =
    ctx.color_vibrance || ctx.color_improve || ctx.color_sharpen || ctx.color_brightness
      ? {
          vibrance: ctx.color_vibrance ? parseInt(ctx.color_vibrance, 10) : 60,
          improve: (ctx.color_improve as ColorSettings['improve']) || 'indoor',
          sharpen: ctx.color_sharpen ? parseInt(ctx.color_sharpen, 10) : 80,
          brightness: ctx.color_brightness ? parseInt(ctx.color_brightness, 10) : 0,
        }
      : undefined

  const { thumbnailUrl, fullUrl, originalUrl } = buildUrls(publicId, crop, corners, colorSettings)

  return {
    id: publicId,
    publicId,
    thumbnailUrl,
    fullUrl,
    originalUrl,
    title: ctx.title || undefined,
    year,
    dimensions: ctx.dimensions || undefined,
    technique: ctx.technique || 'Olja på pannå',
    price: price && !isNaN(price) ? price : undefined,
    available,
    featured: false,
    crop,
    corners,
    colorSettings,
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
