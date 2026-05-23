'use client'

import { useEffect, useCallback } from 'react'
import type { GalleryPainting } from '@/types/painting'

interface Props {
  painting: GalleryPainting
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

export default function Lightbox({ painting, onClose, onPrev, onNext, hasPrev, hasNext }: Props) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft' && onPrev && hasPrev) onPrev()
    if (e.key === 'ArrowRight' && onNext && hasNext) onNext()
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const subject = encodeURIComponent(`Förfrågan om "${painting.title || 'tavla'}"`)
  const body = encodeURIComponent(
    `Hej Christina,\n\nJag är intresserad av tavlan "${painting.title || 'utan titel'}"${painting.dimensions ? ` (${painting.dimensions})` : ''}.\n\nMed vänliga hälsningar,`
  )
  const mailtoLink = `mailto:christina@example.com?subject=${subject}&body=${body}`

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl flex flex-col lg:flex-row bg-warm shadow-2xl max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center bg-white/80 hover:bg-white text-[#1C1C1C] rounded-full transition-colors"
          aria-label="Stäng"
        >
          ✕
        </button>

        {/* Image */}
        <div className="relative lg:flex-1 bg-[#F0EDE7] flex items-center justify-center min-h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={painting.fullUrl}
            alt={painting.title || 'Målning av Christina Hammarström'}
            className="object-contain max-h-[60vh] lg:max-h-[85vh] w-auto"
          />

          {hasPrev && (
            <button
              onClick={onPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white rounded-full transition-colors text-lg"
              aria-label="Föregående"
            >
              ←
            </button>
          )}
          {hasNext && (
            <button
              onClick={onNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white rounded-full transition-colors text-lg"
              aria-label="Nästa"
            >
              →
            </button>
          )}
        </div>

        {/* Info panel */}
        <div className="lg:w-72 xl:w-80 p-8 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-warm-dark">
          <div>
            {painting.title && (
              <h2 className="font-serif text-2xl mb-4">{painting.title}</h2>
            )}
            <dl className="space-y-2.5 text-sm text-[#555]">
              {painting.year && (
                <div className="flex gap-2">
                  <dt className="text-[#999] w-24 shrink-0">År</dt>
                  <dd>{painting.year}</dd>
                </div>
              )}
              {painting.technique && (
                <div className="flex gap-2">
                  <dt className="text-[#999] w-24 shrink-0">Teknik</dt>
                  <dd>{painting.technique}</dd>
                </div>
              )}
              {painting.dimensions && (
                <div className="flex gap-2">
                  <dt className="text-[#999] w-24 shrink-0">Mått</dt>
                  <dd>{painting.dimensions}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="mt-8">
            {painting.available ? (
              <>
                {painting.price && (
                  <p className="text-2xl font-serif text-[#1C1C1C] mb-4">
                    {painting.price.toLocaleString('sv-SE')} kr
                  </p>
                )}
                <a
                  href={mailtoLink}
                  className="block w-full text-center bg-[#1C1C1C] text-white text-sm tracking-wider uppercase py-3.5 px-6 hover:bg-navy transition-colors"
                >
                  Skicka förfrågan
                </a>
                <p className="text-xs text-[#999] text-center mt-3">
                  Svarar vanligtvis inom 1–2 dagar
                </p>
              </>
            ) : (
              <p className="text-sm text-[#999] uppercase tracking-wider py-3 border border-[#DDD] text-center">
                Såld
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
