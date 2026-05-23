import Gallery from '@/components/Gallery'
import HeroSlideshow from '@/components/HeroSlideshow'
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

  // Pick up to 9 paintings spread across the collection for the slideshow
  const slideshowPaintings = paintings.length <= 9
    ? paintings
    : Array.from({ length: 9 }, (_, i) =>
        paintings[Math.round((i / 8) * (paintings.length - 1))]
      )

  const available = paintings.filter(p => p.available).length

  return (
    <>
      {/* Hero slideshow — full width, no padding */}
      {paintings.length > 0 && (
        <div className="mb-12">
          <HeroSlideshow paintings={slideshowPaintings} />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="mb-10 flex items-baseline justify-between">
          <h1 className="font-serif text-3xl md:text-4xl">Alla verk</h1>
          {available > 0 && (
            <p className="text-[#888] text-sm">{available} till salu</p>
          )}
        </div>
        <Gallery paintings={paintings} />
      </div>
    </>
  )
}
