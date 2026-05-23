import Gallery from '@/components/Gallery'
import { fetchAllPaintings } from '@/lib/cloudinary'
import { getMetaForPainting } from '@/data/paintings'
import type { GalleryPainting } from '@/types/painting'

export const revalidate = 3600 // Uppdatera galleriet max 1 gång per timme

export default async function HomePage() {
  let paintings: GalleryPainting[] = []

  try {
    const cloudinaryPaintings = await fetchAllPaintings()
    paintings = cloudinaryPaintings.map((cp, index) => {
      const meta = getMetaForPainting(cp.publicId)
      return {
        id: cp.publicId,
        publicId: cp.publicId,
        thumbnailUrl: cp.thumbnailUrl,
        fullUrl: cp.fullUrl,
        title: meta?.title,
        year: meta?.year,
        dimensions: meta?.dimensions,
        technique: meta?.technique ?? 'Olja på pannå',
        price: meta?.price,
        available: meta?.available ?? true,
        featured: meta?.featured ?? false,
      }
    })
  } catch (error) {
    console.error('Kunde inte hämta bilder från Cloudinary:', error)
  }

  const available = paintings.filter(p => p.available).length

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="font-serif text-4xl md:text-5xl mb-3">Verk</h1>
        {available > 0 && (
          <p className="text-[#888] text-sm">{available} verk till salu</p>
        )}
      </div>
      <Gallery paintings={paintings} />
    </div>
  )
}
