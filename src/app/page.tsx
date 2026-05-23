import Gallery from '@/components/Gallery'
import { paintings } from '@/data/paintings'

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="font-serif text-4xl md:text-5xl mb-3">Verk</h1>
        <p className="text-[#888] text-sm">
          {paintings.filter(p => p.available).length > 0
            ? `${paintings.filter(p => p.available).length} verk till salu`
            : 'Samtliga verk'}
        </p>
      </div>
      <Gallery paintings={paintings} />
    </div>
  )
}
