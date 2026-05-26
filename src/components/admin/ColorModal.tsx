'use client'

import { useState, useEffect } from 'react'
import type { GalleryPainting, ColorSettings } from '@/types/painting'
import { defaultColorSettings } from '@/types/painting'

interface Props {
  painting: GalleryPainting
  cloudName: string
  onSave: (cs: ColorSettings) => void
  onClose: () => void
}

type ImproveMode = ColorSettings['improve']

const IMPROVE_OPTIONS: { value: ImproveMode; label: string }[] = [
  { value: 'indoor', label: 'Inomhus (standard)' },
  { value: 'outdoor', label: 'Utomhus' },
  { value: 'none', label: 'Ingen' },
]

function buildPreviewUrl(cloudName: string, publicId: string, cs: ColorSettings, corners?: GalleryPainting['corners'], crop?: GalleryPainting['crop']): string {
  const parts: string[] = []

  if (corners) {
    const x = Math.round(Math.min(corners.tl.x, corners.bl.x))
    const y = Math.round(Math.min(corners.tl.y, corners.tr.y))
    const w = Math.round(Math.max(corners.tr.x, corners.br.x) - x)
    const h = Math.round(Math.max(corners.bl.y, corners.br.y) - y)
    parts.push(`c_crop,x_${x},y_${y},w_${w},h_${h}`)
    if (corners.rotation) parts.push(`a_${Math.round(corners.rotation)}`)
  } else if (crop) {
    parts.push(`c_crop,x_${Math.round(crop.x)},y_${Math.round(crop.y)},w_${Math.round(crop.w)},h_${Math.round(crop.h)}`)
    if (crop.rotation) parts.push(`a_${Math.round(crop.rotation)}`)
  }

  if (cs.improve !== 'none') parts.push(`e_improve:${cs.improve}`)
  if (cs.vibrance > 0) parts.push(`e_vibrance:${cs.vibrance}`)
  if (cs.sharpen > 0) parts.push(`e_sharpen:${cs.sharpen}`)
  if (cs.brightness !== 0) parts.push(`e_brightness:${cs.brightness}`)

  parts.push('w_900,c_limit,q_auto,f_auto')
  return `https://res.cloudinary.com/${cloudName}/image/upload/${parts.join('/')}/${publicId}`
}

export default function ColorModal({ painting, cloudName, onSave, onClose }: Props) {
  const initial: ColorSettings = painting.colorSettings ?? { ...defaultColorSettings }
  const [cs, setCs] = useState<ColorSettings>(initial)
  const [previewUrl, setPreviewUrl] = useState(() =>
    buildPreviewUrl(cloudName, painting.publicId, initial, painting.corners, painting.crop)
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function update(patch: Partial<ColorSettings>) {
    const next = { ...cs, ...patch }
    setCs(next)
    setPreviewUrl(buildPreviewUrl(cloudName, painting.publicId, next, painting.corners, painting.crop) + `?v=${Date.now()}`)
  }

  function handleReset() {
    update({ ...defaultColorSettings })
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/admin/save-color', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId: painting.publicId, colorSettings: cs }),
    })
    setSaving(false)
    if (res.ok) {
      onSave(cs)
    } else {
      alert('Kunde inte spara. Försök igen.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div>
          <h2 className="text-white font-serif text-lg">Färgjustering</h2>
          <p className="text-white/50 text-xs mt-0.5">
            {painting.title ?? painting.publicId.split('/').pop()}
          </p>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white text-2xl leading-none px-1">✕</button>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-0">
        {/* Preview */}
        <div className="flex-1 flex items-center justify-center p-6 bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={previewUrl}
            src={previewUrl}
            alt={painting.title ?? 'Förhandsvisning'}
            className="max-h-[60vh] max-w-full object-contain"
          />
        </div>

        {/* Controls */}
        <div className="flex-none w-full lg:w-80 p-6 flex flex-col gap-6 border-l border-white/10">

          {/* Improve mode */}
          <div>
            <label className="text-white/70 text-sm block mb-2">Automatisk förbättring</label>
            <div className="flex flex-col gap-1.5">
              {IMPROVE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update({ improve: opt.value })}
                  className={`text-left text-sm px-3 py-2 border transition-colors ${
                    cs.improve === opt.value
                      ? 'border-[#C4A35A] text-[#C4A35A] bg-[#C4A35A]/10'
                      : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vibrance slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-white/70 text-sm">Livfullhet (vibrance)</label>
              <span className="text-white font-mono text-sm tabular-nums">{cs.vibrance}</span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={cs.vibrance}
              onChange={e => update({ vibrance: parseInt(e.target.value) })}
              className="w-full accent-[#C4A35A]"
            />
            <div className="flex justify-between text-white/30 text-xs mt-1">
              <span>0</span><span>50</span><span>100</span>
            </div>
          </div>

          {/* Sharpen slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-white/70 text-sm">Skärpa (sharpen)</label>
              <span className="text-white font-mono text-sm tabular-nums">{cs.sharpen}</span>
            </div>
            <input
              type="range" min={0} max={200} step={10}
              value={cs.sharpen}
              onChange={e => update({ sharpen: parseInt(e.target.value) })}
              className="w-full accent-[#C4A35A]"
            />
            <div className="flex justify-between text-white/30 text-xs mt-1">
              <span>0</span><span>100</span><span>200</span>
            </div>
          </div>

          {/* Brightness slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-white/70 text-sm">Ljusstyrka (brightness)</label>
              <span className="text-white font-mono text-sm tabular-nums">
                {cs.brightness > 0 ? '+' : ''}{cs.brightness}
              </span>
            </div>
            <input
              type="range" min={-50} max={50} step={5}
              value={cs.brightness}
              onChange={e => update({ brightness: parseInt(e.target.value) })}
              className="w-full accent-[#C4A35A]"
            />
            <div className="flex justify-between text-white/30 text-xs mt-1">
              <span>−50</span><span>0</span><span>+50</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#C4A35A] text-white text-sm px-6 py-2.5 font-medium disabled:opacity-40 hover:bg-[#b8925a] transition-colors"
            >
              {saving ? 'Sparar…' : 'Spara färgjustering'}
            </button>
            <button
              onClick={handleReset}
              className="border border-white/30 text-white/70 text-sm px-4 py-2.5 hover:border-white/60 transition-colors"
            >
              Återställ standardvärden
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
    </div>
  )
}
