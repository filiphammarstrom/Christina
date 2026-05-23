'use client'

import { useState } from 'react'
import Lightbox from './Lightbox'
import type { GalleryPainting } from '@/types/painting'

type Filter = 'all' | 'available' | 'sold'

interface Props {
  paintings: GalleryPainting[]
}

export default function Gallery({ paintings }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const filtered = paintings.filter(p => {
    if (filter === 'available') return p.available
    if (filter === 'sold') return !p.available
    return true
  })

  const selected = selectedIndex !== null ? filtered[selectedIndex] : null

  if (paintings.length === 0) {
    return (
      <div className="text-center py-32 text-[#999]">
        <p className="font-serif text-2xl mb-3">Bilder laddas upp</p>
        <p className="text-sm">Kom tillbaka snart.</p>
      </div>
    )
  }

  return (
    <>
      {/* Filter */}
      <div className="flex items-center gap-1 mb-10">
        {(['all', 'available', 'sold'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm tracking-wider uppercase transition-colors ${
              filter === f
                ? 'bg-[#1C1C1C] text-white'
                : 'text-[#888] hover:text-[#1C1C1C]'
            }`}
          >
            {f === 'all' ? 'Alla' : f === 'available' ? 'Till salu' : 'Sålda'}
            <span className="ml-1.5 text-xs opacity-60">
              {f === 'all'
                ? paintings.length
                : f === 'available'
                ? paintings.filter(p => p.available).length
                : paintings.filter(p => !p.available).length}
            </span>
          </button>
        ))}
      </div>

      {/* Masonry grid */}
      <div className="masonry-grid">
        {filtered.map((painting, index) => (
          <div
            key={painting.id}
            className="masonry-item group cursor-pointer"
            onClick={() => setSelectedIndex(index)}
          >
            <div className="relative overflow-hidden bg-warm-dark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={painting.thumbnailUrl}
                alt={painting.title || 'Målning av Christina Hammarström'}
                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                loading="lazy"
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-end">
                <div className="w-full p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  {painting.title && (
                    <p className="text-white font-serif text-lg leading-tight">{painting.title}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    {painting.price && painting.available ? (
                      <p className="text-white/80 text-sm">{painting.price.toLocaleString('sv-SE')} kr</p>
                    ) : !painting.available ? (
                      <p className="text-white/60 text-xs uppercase tracking-wider">Såld</p>
                    ) : null}
                    {painting.dimensions && (
                      <p className="text-white/60 text-xs">{painting.dimensions}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sold badge */}
              {!painting.available && (
                <div className="absolute top-3 left-3 bg-white/90 text-[#888] text-xs uppercase tracking-wider px-2 py-1">
                  Såld
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selected !== null && selectedIndex !== null && (
        <Lightbox
          painting={selected}
          onClose={() => setSelectedIndex(null)}
          onPrev={() => setSelectedIndex(i => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setSelectedIndex(i => (i !== null && i < filtered.length - 1 ? i + 1 : i))}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex < filtered.length - 1}
        />
      )}
    </>
  )
}
