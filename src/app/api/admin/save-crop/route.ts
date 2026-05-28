import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import type { Corners } from '@/types/painting'
import { warpPerspective, naturalOutputSize } from '@/lib/perspective'

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
  const { publicId } = body

  if (!publicId) {
    return NextResponse.json({ error: 'Saknar publicId' }, { status: 400 })
  }

  const context: Record<string, string> = {}

  if (body.reset) {
    // Clear all crop/corner data and remove corrected image reference
    context.corner_tl_x = ''; context.corner_tl_y = ''
    context.corner_tr_x = ''; context.corner_tr_y = ''
    context.corner_br_x = ''; context.corner_br_y = ''
    context.corner_bl_x = ''; context.corner_bl_y = ''
    context.crop_x = ''; context.crop_y = ''; context.crop_w = ''; context.crop_h = ''
    context.crop_rotation = ''
    context.corrected_public_id = ''
    await cloudinary.api.update(publicId, { context })
    return NextResponse.json({ ok: true })
  }

  if (body.corners) {
    const c = body.corners as Corners
    const { originalWidth, originalHeight } = body as { originalWidth?: number; originalHeight?: number }

    context.corner_tl_x = String(Math.round(c.tl.x))
    context.corner_tl_y = String(Math.round(c.tl.y))
    context.corner_tr_x = String(Math.round(c.tr.x))
    context.corner_tr_y = String(Math.round(c.tr.y))
    context.corner_br_x = String(Math.round(c.br.x))
    context.corner_br_y = String(Math.round(c.br.y))
    context.corner_bl_x = String(Math.round(c.bl.x))
    context.corner_bl_y = String(Math.round(c.bl.y))
    context.crop_rotation = c.rotation ? String(c.rotation) : ''
    context.crop_x = ''
    context.crop_y = ''
    context.crop_w = ''
    context.crop_h = ''

    // Save corners immediately so nothing is lost even if warp fails
    await cloudinary.api.update(publicId, { context })

    // --- Server-side perspective correction ---
    let correctedPublicId: string | undefined
    try {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME!
      const origUrl = `https://res.cloudinary.com/${cloudName}/image/upload/w_1600,c_limit,q_85,f_jpg/${publicId}`

      const imgRes = await fetch(origUrl)
      if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`)
      const srcBuffer = Buffer.from(await imgRes.arrayBuffer())

      // Determine source image dimensions (may be scaled by c_limit)
      const { default: sharp } = await import('sharp')
      const meta = await sharp(srcBuffer).metadata()
      const downloadedW = meta.width!
      const downloadedH = meta.height!

      // Scale corners from original pixel space to downloaded image space
      const scaleX = originalWidth ? downloadedW / originalWidth : 1
      const scaleY = originalHeight ? downloadedH / originalHeight : 1
      const scaledCorners = {
        tl: { x: c.tl.x * scaleX, y: c.tl.y * scaleY },
        tr: { x: c.tr.x * scaleX, y: c.tr.y * scaleY },
        br: { x: c.br.x * scaleX, y: c.br.y * scaleY },
        bl: { x: c.bl.x * scaleX, y: c.bl.y * scaleY },
      }

      const { w: outW, h: outH } = naturalOutputSize(
        scaledCorners.tl, scaledCorners.tr, scaledCorners.br, scaledCorners.bl
      )

      const correctedBuffer = await warpPerspective(srcBuffer, scaledCorners, outW, outH)

      correctedPublicId = `${publicId}_corrected`
      const base64 = correctedBuffer.toString('base64')
      await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64}`, {
        public_id: correctedPublicId,
        overwrite: true,
        resource_type: 'image',
        invalidate: true,
      })

      await cloudinary.api.update(publicId, { context: { corrected_public_id: correctedPublicId } })
    } catch (err) {
      console.error('Perspective warp failed — corners saved, corrected image skipped:', err)
    }

    return NextResponse.json({ ok: true, correctedPublicId })
  }

  // Legacy simple-crop path
  const { x, y, w, h, rotation } = body
  if (x == null || y == null || w == null || h == null) {
    return NextResponse.json({ error: 'Saknar crop-parametrar' }, { status: 400 })
  }
  context.crop_x = String(Math.round(x))
  context.crop_y = String(Math.round(y))
  context.crop_w = String(Math.round(w))
  context.crop_h = String(Math.round(h))
  context.crop_rotation = rotation && rotation !== 0 ? String(rotation) : ''

  try {
    await cloudinary.api.update(publicId, { context })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('save-crop error:', err)
    return NextResponse.json({ error: 'Misslyckades att spara' }, { status: 500 })
  }
}
