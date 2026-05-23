import { fetchAllPaintings } from '@/lib/cloudinary'
import AdminGallery from '@/components/admin/AdminGallery'
import type { GalleryPainting } from '@/types/painting'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  let paintings: GalleryPainting[] = []
  try {
    paintings = await fetchAllPaintings()
  } catch {
    // Cloudinary ej konfigurerat ännu
  }

  return (
    <AdminGallery
      initialPaintings={paintings}
      cloudName={process.env.CLOUDINARY_CLOUD_NAME ?? 'dflbuhivd'}
    />
  )
}
