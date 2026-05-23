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
}
