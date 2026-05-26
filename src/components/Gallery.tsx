'use client'

import { useState } from 'react'
import Lightbox from './Lightbox'
import type { GalleryPainting } from '@/types/painting'

type AvailFilter = 'all' | 'available' | 'sold'
type SizeFilter = 'all' | 'large' | 'small'

const SIZE_THRESHOLD = 60 // cm — paintings with max dimension ≥ this are "large"

function maxDimension(dimensions?: string): number | null {
  if (!dimensions) return null
  const nums = dimensions.match(/\d+/g)
  if (!nums || nums.length === 0) return null
  return Math.max(...nums.map(Number))
}

function matchesSize(p: GalleryPainting, sf: SizeFilter): boolean {
  if (sf === 'all') return true
  const max = maxDimension(p.dimensions)
  if (max === null) return true // no dimensions — include in both
  return sf === 'large' ? max >= SIZE_THRESHOLD : max < SIZE_THRESHOLD
}

interface Props {
  paintings: GalleryPainting[]
}

export default function Gallery({ paintings }: Props) {
  const [avail, setAvail] = useState<AvailFilter>('all')
  const [size, setSize] = useState<SizeFilter>('all')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const filtered = paintings.filter(p => {
    if (avail === 'available' && !p.available) return false
    if (avail === 'sold' && p.available) return false
    return matchesSize(p, size)
  })

  const selected = selectedIndex !== null ? filtered[selectedIndex] : null

  function countAvail(af: AvailFilter) {
    return paintings.filter(p => {
      if (af === 'available' && !p.available) return false
      if (af === 'sold' && p.available) return false
      return matchesSize(p, size)
    }).length
  }

  function countSize(sf: SizeFilter) {
    return paintings.filter(p => {
      if (avail === 'available' && !p.available) return false
      if (avail === 'sold' && p.available) return false
      return matchesSize(p, sf)
    }).length
  }

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
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-10">
        {/* Availability */}
        <div className="flex items-center gap-1">
          {(['all', 'available', 'sold'] as AvailFilter[]).map(f => (
            <button
              key={f}
              onClick={() => { setAvail(f); setSelectedIndex(null) }}
              className={`px-4 py-1.5 text-sm tracking-wider uppercase transition-colors ${
                avail === f
                  ? 'bg-[#1C1C1C] text-white'
                  : 'text-[#888] hover:text-[#1C1C1C]'
              }`}
            >
              {f === 'all' ? 'Alla' : f === 'available' ? 'Till salu' : 'Sålda'}
              <span className="ml-1.5 text-xs opacity-60">{countAvail(f)}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-[#DDD] hidden sm:block" />

        {/* Size */}
        <div className="flex items-center gap-1">
          {(['all', 'large', 'small'] as SizeFilter[]).map(f => (
            <button
              key={f}
              onClick={() => { setSize(f); setSelectedIndex(null) }}
              className={`px-4 py-1.5 text-sm tracking-wider uppercase transition-colors ${
                size === f
                  ? 'bg-[#1C1C1C] text-white'
                  : 'text-[#888] hover:text-[#1C1C1C]'
              }`}
            >
              {f === 'all' ? 'Alla storlekar' : f === 'large' ? 'Stora' : 'Mindre'}
              <span className="ml-1.5 text-xs opacity-60">{countSize(f)}</span>
            </button>
          ))}
        </div>
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
