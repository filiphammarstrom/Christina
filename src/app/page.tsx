import Gallery from '@/components/Gallery'
import { fetchAllPaintings } from '@/lib/cloudinary'
import type { GalleryPainting } from '@/types/painting'

export const revalidate = 3600

export default async function HomePage() {
  let paintings: GalleryPainting[] = []

  try {
    paintings = await fetchAllPaintings()
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
