export interface Crop {
  x: number
  y: number
  w: number
  h: number
  rotation?: number
}

export interface Corners {
  tl: { x: number; y: number }
  tr: { x: number; y: number }
  br: { x: number; y: number }
  bl: { x: number; y: number }
  rotation?: number
}

export interface ColorSettings {
  vibrance: number       // 0–100, default 60
  improve: 'indoor' | 'outdoor' | 'none'  // default 'indoor'
  sharpen: number        // 0–200, default 80
  brightness: number     // -50–50, default 0
}

export const defaultColorSettings: ColorSettings = {
  vibrance: 60,
  improve: 'indoor',
  sharpen: 80,
  brightness: 0,
}

export interface GalleryPainting {
  id: string
  publicId: string
  thumbnailUrl: string
  fullUrl: string
  originalUrl: string   // untransformed source image — used by CropModal
  title?: string
  year?: number
  dimensions?: string
  technique?: string
  price?: number
  available: boolean
  featured?: boolean
  crop?: Crop
  corners?: Corners
  colorSettings?: ColorSettings
  originalWidth?: number
  originalHeight?: number
}
