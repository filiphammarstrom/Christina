'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { GalleryPainting, Corners } from '@/types/painting'

interface Props {
  painting: GalleryPainting
  onSave: (corners: Corners) => void
  onClose: () => void
}

type CornerKey = 'tl' | 'tr' | 'br' | 'bl'

export default function CropModal({ painting, onSave, onClose }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [corners, setCorners] = useState<Record<CornerKey, { x: number; y: number }> | null>(null)
  const draggingRef = useRef<CornerKey | null>(null)
  const [saving, setSaving] = useState(false)
  const [autoDetecting, setAutoDetecting] = useState(false)

  function defaultCorners(rect: DOMRect) {
    const pad = Math.min(rect.width, rect.height) * 0.04
    return {
      tl: { x: pad, y: pad },
      tr: { x: rect.width - pad, y: pad },
      br: { x: rect.width - pad, y: rect.height - pad },
      bl: { x: pad, y: rect.height - pad },
    }
  }

  function initCorners() {
    const img = imgRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()

    if (painting.corners) {
      const scaleX = rect.width / (painting.originalWidth ?? rect.width)
      const scaleY = rect.height / (painting.originalHeight ?? rect.height)
      setCorners({
        tl: { x: painting.corners.tl.x * scaleX, y: painting.corners.tl.y * scaleY },
        tr: { x: painting.corners.tr.x * scaleX, y: painting.corners.tr.y * scaleY },
        br: { x: painting.corners.br.x * scaleX, y: painting.corners.br.y * scaleY },
        bl: { x: painting.corners.bl.x * scaleX, y: painting.corners.bl.y * scaleY },
      })
    } else {
      setCorners(defaultCorners(rect))
    }
  }

  function handleImageLoad() {
    setLoaded(true)
    requestAnimationFrame(initCorners)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const key = draggingRef.current
    if (!key || !imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    setCorners(prev => prev ? { ...prev, [key]: { x, y } } : prev)
  }, [])

  const handleMouseUp = useCallback(() => { draggingRef.current = null }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleAutoDetect() {
    if (!imgRef.current || !loaded) return
    setAutoDetecting(true)

    const res = await fetch('/api/admin/auto-crop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicId: painting.publicId,
        originalWidth: painting.originalWidth,
        originalHeight: painting.originalHeight,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Okänt fel' }))
      alert(`AI-identifiering misslyckades:\n${err.error ?? res.status}`)
      setAutoDetecting(false)
      return
    }

    const data: Corners = await res.json()
    const img = imgRef.current
    if (!img) { setAutoDetecting(false); return }
    const rect = img.getBoundingClientRect()
    const scaleX = rect.width / (painting.originalWidth ?? rect.width)
    const scaleY = rect.height / (painting.originalHeight ?? rect.height)

    setCorners({
      tl: { x: data.tl.x * scaleX, y: data.tl.y * scaleY },
      tr: { x: data.tr.x * scaleX, y: data.tr.y * scaleY },
      br: { x: data.br.x * scaleX, y: data.br.y * scaleY },
      bl: { x: data.bl.x * scaleX, y: data.bl.y * scaleY },
    })
    setAutoDetecting(false)
  }

  async function handleSave() {
    if (!corners || !imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const scaleX = (painting.originalWidth ?? rect.width) / rect.width
    const scaleY = (painting.originalHeight ?? rect.height) / rect.height

    const originalCorners: Corners = {
      tl: { x: Math.round(corners.tl.x * scaleX), y: Math.round(corners.tl.y * scaleY) },
      tr: { x: Math.round(corners.tr.x * scaleX), y: Math.round(corners.tr.y * scaleY) },
      br: { x: Math.round(corners.br.x * scaleX), y: Math.round(corners.br.y * scaleY) },
      bl: { x: Math.round(corners.bl.x * scaleX), y: Math.round(corners.bl.y * scaleY) },
    }

    setSaving(true)
    const res = await fetch('/api/admin/save-crop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId: painting.publicId, corners: originalCorners }),
    })
    setSaving(false)

    if (res.ok) {
      onSave(originalCorners)
    } else {
      alert('Kunde inte spara. Försök igen.')
    }
  }

  function handleReset() {
    const img = imgRef.current
    if (!img) return
    setCorners(defaultCorners(img.getBoundingClientRect()))
  }

  const c = corners

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div>
          <h2 className="text-white font-serif text-lg">Beskärning &amp; perspektivkorrigering</h2>
          <p className="text-white/50 text-xs mt-0.5">
            {painting.title ?? painting.publicId.split('/').pop()}
          </p>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white text-2xl leading-none px-1">✕</button>
      </div>

      <div className="flex-1 overflow-auto flex flex-col items-center gap-4 p-6">
        {/* Auto-detect */}
        <div className="w-full max-w-2xl flex flex-col gap-2">
          <button
            onClick={handleAutoDetect}
            disabled={autoDetecting || !loaded}
            className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-40 border border-white/20 text-white text-sm px-5 py-2.5 transition-colors flex items-center justify-center gap-2"
          >
            {autoDetecting ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                AI analyserar bilden…
              </>
            ) : (
              '✦ Hitta tavlans hörn automatiskt med AI'
            )}
          </button>
          <p className="text-white/40 text-xs text-center">
            eller dra de guldfärgade hörnen till tavlans hörn för hand — fungerar även för sneda vinklar
          </p>
        </div>

        {/* Image + SVG overlay + corner handles */}
        <div className="relative inline-block select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={painting.fullUrl}
            alt={painting.title ?? 'Tavla'}
            className="block max-h-[55vh] max-w-[90vw] object-contain"
            style={{ userSelect: 'none' }}
            onLoad={handleImageLoad}
            draggable={false}
          />

          {c && loaded && (
            <>
              {/* SVG overlay: darken outside + quadrilateral outline */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: '100%', height: '100%', overflow: 'visible' }}
              >
                <defs>
                  <mask id="cmask">
                    <rect width="100%" height="100%" fill="white" />
                    <polygon
                      points={`${c.tl.x},${c.tl.y} ${c.tr.x},${c.tr.y} ${c.br.x},${c.br.y} ${c.bl.x},${c.bl.y}`}
                      fill="black"
                    />
                  </mask>
                </defs>
                {/* Dark surround */}
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#cmask)" />
                {/* Gold quadrilateral outline */}
                <polygon
                  points={`${c.tl.x},${c.tl.y} ${c.tr.x},${c.tr.y} ${c.br.x},${c.br.y} ${c.bl.x},${c.bl.y}`}
                  fill="none"
                  stroke="#C4A35A"
                  strokeWidth="2"
                />
              </svg>

              {/* Draggable corner handles */}
              {(Object.entries(c) as [CornerKey, { x: number; y: number }][]).map(([key, pos]) => (
                <div
                  key={key}
                  className="absolute w-7 h-7 rounded-full bg-[#C4A35A] border-2 border-white shadow-lg cursor-grab active:cursor-grabbing z-10"
                  style={{ left: pos.x - 14, top: pos.y - 14, touchAction: 'none' }}
                  onMouseDown={e => { e.preventDefault(); draggingRef.current = key }}
                />
              ))}
            </>
          )}

          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="text-white/60 text-sm">Laddar bild…</span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleSave}
            disabled={saving || !corners || !loaded}
            className="bg-[#C4A35A] text-white text-sm px-6 py-2.5 font-medium disabled:opacity-40 hover:bg-[#b8925a] transition-colors"
          >
            {saving ? 'Sparar…' : 'Spara korrigering'}
          </button>
          <button
            onClick={handleReset}
            className="border border-white/30 text-white/70 text-sm px-4 py-2.5 hover:border-white/60 transition-colors"
          >
            Återställ
          </button>
          <button
            onClick={onClose}
            className="border border-white/15 text-white/40 text-sm px-4 py-2.5 hover:border-white/30 transition-colors"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  )
}
