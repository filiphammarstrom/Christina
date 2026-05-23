'use client'

import { useState, useEffect, useCallback } from 'react'
import Lightbox from '@/components/Lightbox'
import type { GalleryPainting } from '@/types/painting'

interface Props {
  paintings: GalleryPainting[]
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

export default function HeroSlideshow({ paintings }: Props) {
  const groups = chunk(paintings, 3)
  const [groupIndex, setGroupIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [paused, setPaused] = useState(false)
  const [lightboxPainting, setLightboxPainting] = useState<GalleryPainting | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const advance = useCallback((dir: 1 | -1 = 1) => {
    setVisible(false)
    setTimeout(() => {
      setGroupIndex(i => (i + dir + groups.length) % groups.length)
      setVisible(true)
    }, 350)
  }, [groups.length])

  useEffect(() => {
    if (paused || groups.length <= 1) return
    const t = setInterval(() => advance(1), 5000)
    return () => clearInterval(t)
  }, [paused, advance, groups.length])

  if (paintings.length === 0) return null

  const currentGroup = groups[groupIndex] ?? []

  return (
    <>
      <div
        className="relative select-none"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Paintings row */}
        <div
          className="flex gap-1 md:gap-2 h-[42vw] max-h-[580px] min-h-[220px] transition-opacity duration-350"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {currentGroup.map((p, i) => (
            <div
              key={p.publicId}
              className="flex-1 overflow-hidden cursor-pointer bg-warm-dark relative group"
              onClick={() => {
                setLightboxPainting(p)
                setLightboxIndex(paintings.indexOf(p))
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumbnailUrl}
                alt={p.title ?? 'Målning av Christina Hammarström'}
                className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.03]"
              />
              {/* Subtle title on hover */}
              {p.title && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/40 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white text-sm font-serif">{p.title}</p>
                </div>
              )}
            </div>
          ))}
          {/* Fill empty slots if last group has fewer than 3 */}
          {Array.from({ length: 3 - currentGroup.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex-1 bg-warm-dark" />
          ))}
        </div>

        {/* Prev / Next arrows */}
        {groups.length > 1 && (
          <>
            <button
              onClick={() => advance(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/70 hover:bg-white rounded-full flex items-center justify-center text-sm transition-all opacity-0 hover:opacity-100 group-hover:opacity-100 shadow"
              style={{ opacity: undefined }}
              onMouseEnter={() => setPaused(true)}
              aria-label="Föregående"
            >
              ←
            </button>
            <button
              onClick={() => advance(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/70 hover:bg-white rounded-full flex items-center justify-center text-sm transition-all shadow"
              onMouseEnter={() => setPaused(true)}
              aria-label="Nästa"
            >
              →
            </button>
          </>
        )}

        {/* Dot navigation */}
        {groups.length > 1 && (
          <div className="flex justify-center gap-1.5 pt-4">
            {groups.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setVisible(false)
                  setTimeout(() => { setGroupIndex(i); setVisible(true) }, 350)
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === groupIndex ? 'bg-[#1C1C1C] w-4' : 'bg-[#CCC]'
                }`}
                aria-label={`Grupp ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPainting && lightboxIndex !== null && (
        <Lightbox
          painting={lightboxPainting}
          onClose={() => { setLightboxPainting(null); setLightboxIndex(null) }}
          onPrev={() => {
            const prev = lightboxIndex - 1
            if (prev >= 0) { setLightboxPainting(paintings[prev]); setLightboxIndex(prev) }
          }}
          onNext={() => {
            const next = lightboxIndex + 1
            if (next < paintings.length) { setLightboxPainting(paintings[next]); setLightboxIndex(next) }
          }}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < paintings.length - 1}
        />
      )}
    </>
  )
}
