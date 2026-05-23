export interface Crop {
  x: number
  y: number
  w: number
  h: number
  rotation?: number // degrees, applied after crop to straighten skewed photos
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
  originalWidth?: number
  originalHeight?: number
}
