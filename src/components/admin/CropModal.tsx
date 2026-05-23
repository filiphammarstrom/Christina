'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { GalleryPainting, Crop } from '@/types/painting'

interface Props {
  painting: GalleryPainting
  onSave: (crop: Crop) => void
  onClose: () => void
}

interface SelectionRect {
  x: number
  y: number
  w: number
  h: number
}

export default function CropModal({ painting, onSave, onClose }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const startPosRef = useRef({ x: 0, y: 0 })
  const [selection, setSelection] = useState<SelectionRect | null>(null)
  const [rotation, setRotation] = useState(painting.crop?.rotation ?? 0)
  const [saving, setSaving] = useState(false)
  const [autoDetecting, setAutoDetecting] = useState(false)

  // Restore existing crop as display-space selection after image loads
  useEffect(() => {
    if (!loaded || !painting.crop || !imgRef.current) return
    const img = imgRef.current
    const rect = img.getBoundingClientRect()
    const scaleX = rect.width / (painting.originalWidth ?? rect.width)
    const scaleY = rect.height / (painting.originalHeight ?? rect.height)
    setSelection({
      x: painting.crop.x * scaleX,
      y: painting.crop.y * scaleY,
      w: painting.crop.w * scaleX,
      h: painting.crop.h * scaleY,
    })
  }, [loaded, painting])

  function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(val, max))
  }

  function handleMouseDown(e: React.MouseEvent<HTMLImageElement>) {
    const rect = imgRef.current?.getBoundingClientRect()
    if (!rect) return
    e.preventDefault()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    startPosRef.current = { x, y }
    setIsDragging(true)
    setSelection({ x, y, w: 0, h: 0 })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !imgRef.current) return
      const rect = imgRef.current.getBoundingClientRect()
      const curX = clamp(e.clientX - rect.left, 0, rect.width)
      const curY = clamp(e.clientY - rect.top, 0, rect.height)
      const { x: sx, y: sy } = startPosRef.current
      setSelection({
        x: Math.min(sx, curX),
        y: Math.min(sy, curY),
        w: Math.abs(curX - sx),
        h: Math.abs(curY - sy),
      })
    },
    [isDragging]
  )

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const hasCrop = !!selection && selection.w > 20 && selection.h > 20

  async function handleAutoDetect() {
    if (!imgRef.current) return
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
      alert('Automatisk identifiering misslyckades. Försök rita manuellt.')
      setAutoDetecting(false)
      return
    }

    const crop = await res.json() as { x: number; y: number; w: number; h: number; rotation: number }
    setRotation(crop.rotation ?? 0)

    // Convert original pixel coords → display coords
    const img = imgRef.current
    const rect = img.getBoundingClientRect()
    const scaleX = rect.width / (painting.originalWidth ?? rect.width)
    const scaleY = rect.height / (painting.originalHeight ?? rect.height)
    setSelection({
      x: crop.x * scaleX,
      y: crop.y * scaleY,
      w: crop.w * scaleX,
      h: crop.h * scaleY,
    })

    setAutoDetecting(false)
  }

  async function handleSave() {
    if (!hasCrop || !selection) {
      alert('Rita ett rektangel runt tavlan först.')
      return
    }
    const img = imgRef.current
    if (!img) return

    const rect = img.getBoundingClientRect()
    const scaleX = (painting.originalWidth ?? rect.width) / rect.width
    const scaleY = (painting.originalHeight ?? rect.height) / rect.height

    const crop: Crop = {
      x: Math.round(selection.x * scaleX),
      y: Math.round(selection.y * scaleY),
      w: Math.round(selection.w * scaleX),
      h: Math.round(selection.h * scaleY),
      rotation: rotation !== 0 ? rotation : undefined,
    }

    setSaving(true)
    const res = await fetch('/api/admin/save-crop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId: painting.publicId, ...crop }),
    })
    setSaving(false)

    if (res.ok) {
      onSave(crop)
    } else {
      alert('Kunde inte spara beskärningen. Försök igen.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div>
          <h2 className="text-white font-serif text-lg leading-tight">
            Beskär &amp; räta upp
          </h2>
          <p className="text-white/50 text-xs mt-0.5">
            {painting.title ?? painting.publicId.split('/').pop()}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white text-2xl leading-none px-1"
        >
          ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto flex flex-col items-center gap-5 p-6">
        {/* Auto-detect + instructions */}
        <div className="flex flex-col items-center gap-3 max-w-xl w-full">
          <button
            onClick={handleAutoDetect}
            disabled={autoDetecting || !loaded}
            className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-40 border border-white/20 text-white text-sm px-5 py-2.5 transition-colors flex items-center justify-center gap-2"
          >
            {autoDetecting ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Analyserar bild med AI…
              </>
            ) : (
              <>✦ Identifiera automatiskt med AI</>
            )}
          </button>
          <p className="text-white/40 text-xs text-center">
            eller rita manuellt: dra en rektangel runt tavlan och räta upp med skjutreglaget
          </p>
        </div>

        {/* Image + crop overlay */}
        <div
          className="relative select-none cursor-crosshair inline-block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={painting.fullUrl}
            alt={painting.title ?? 'Tavla'}
            className="block max-h-[55vh] max-w-[90vw] object-contain"
            style={{ userSelect: 'none' }}
            onLoad={() => setLoaded(true)}
            onMouseDown={handleMouseDown}
            draggable={false}
          />

          {/* Selection overlay: box-shadow creates the darkened surround */}
          {selection && selection.w > 4 && selection.h > 4 && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: selection.x,
                top: selection.y,
                width: selection.w,
                height: selection.h,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.60)',
                border: '2px solid rgba(255,255,255,0.9)',
              }}
            >
              {/* Corner handles */}
              {[
                { top: -4, left: -4 },
                { top: -4, right: -4 },
                { bottom: -4, left: -4 },
                { bottom: -4, right: -4 },
              ].map((style, i) => (
                <div
                  key={i}
                  className="absolute w-2.5 h-2.5 bg-white border border-black/20"
                  style={style}
                />
              ))}
            </div>
          )}

          {/* Loading state */}
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="text-white/60 text-sm">Laddar bild…</span>
            </div>
          )}
        </div>

        {/* Rotation slider */}
        <div className="w-full max-w-xl">
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/70 text-sm">
              Rotera för att räta upp
            </label>
            <span className="text-white font-mono text-sm tabular-nums">
              {rotation > 0 ? '+' : ''}{rotation.toFixed(1)}°
            </span>
          </div>
          <input
            type="range"
            min={-30}
            max={30}
            step={0.5}
            value={rotation}
            onChange={e => setRotation(parseFloat(e.target.value))}
            className="w-full h-2 appearance-none bg-white/20 rounded-full cursor-pointer accent-[#C4A35A]"
          />
          <div className="flex justify-between text-white/30 text-xs mt-1.5">
            <span>−30° (vänster)</span>
            <span>0°</span>
            <span>+30° (höger)</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleSave}
            disabled={saving || !hasCrop}
            className="bg-[#C4A35A] text-white text-sm px-6 py-2.5 font-medium disabled:opacity-40 hover:bg-[#b8925a] transition-colors"
          >
            {saving ? 'Sparar…' : 'Spara beskärning'}
          </button>
          <button
            onClick={() => { setSelection(null); setRotation(0) }}
            className="border border-white/30 text-white/70 text-sm px-4 py-2.5 hover:border-white/60 transition-colors"
          >
            Rensa val
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
