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
}

export interface GalleryPainting {
  id: string
  publicId: string
  thumbnailUrl: string
  fullUrl: string
  title?: string
  year?: number
  dimensions?: string
  technique?: string
  price?: number
  available: boolean
  featured?: boolean
  crop?: Crop
  corners?: Corners
  originalWidth?: number
  originalHeight?: number
}
