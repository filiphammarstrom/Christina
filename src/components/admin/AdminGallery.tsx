'use client'

import { useState, useRef } from 'react'
import type { GalleryPainting, Corners, ColorSettings } from '@/types/painting'
import CropModal from './CropModal'
import ColorModal from './ColorModal'

interface Props {
  initialPaintings: GalleryPainting[]
  cloudName: string
}

interface EditState {
  title: string
  price: string
  dimensions: string
  technique: string
  available: boolean
  year: string
}

function toEditState(p: GalleryPainting): EditState {
  return {
    title: p.title ?? '',
    price: p.price ? String(p.price) : '',
    dimensions: p.dimensions ?? '',
    technique: p.technique ?? 'Olja på pannå',
    available: p.available,
    year: p.year ? String(p.year) : '',
  }
}

async function processImage(publicId: string): Promise<string | null> {
  const res = await fetch('/api/admin/process-image', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicId }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.url ?? null
}

export default function AdminGallery({ initialPaintings, cloudName }: Props) {
  const [paintings, setPaintings] = useState(initialPaintings)
  const [editing, setEditing] = useState<Record<string, EditState>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [processing, setProcessing] = useState<Set<string>>(new Set())
  const [processingAll, setProcessingAll] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cropTarget, setCropTarget] = useState<GalleryPainting | null>(null)
  const [colorTarget, setColorTarget] = useState<GalleryPainting | null>(null)
  const [revalidating, setRevalidating] = useState(false)
  const [revalidated, setRevalidated] = useState(false)
  const [autoCroppingAll, setAutoCroppingAll] = useState(false)
  const [autoCropProgress, setAutoCropProgress] = useState<{ done: number; total: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function buildThumbnailUrl(
    publicId: string,
    corners?: Corners,
    colorSettings?: ColorSettings,
  ): string {
    const parts: string[] = []
    if (corners) {
      const x = Math.round(Math.min(corners.tl.x, corners.bl.x))
      const y = Math.round(Math.min(corners.tl.y, corners.tr.y))
      const w = Math.round(Math.max(corners.tr.x, corners.br.x) - x)
      const h = Math.round(Math.max(corners.bl.y, corners.br.y) - y)
      parts.push(`c_crop,x_${x},y_${y},w_${w},h_${h}`)
      if (corners.rotation) parts.push(`a_${Math.round(corners.rotation)}`)
    }
    const vibrance = colorSettings?.vibrance ?? 60
    const improve = colorSettings?.improve ?? 'indoor'
    const sharpen = colorSettings?.sharpen ?? 80
    const brightness = colorSettings?.brightness ?? 0
    if (improve !== 'none') parts.push(`e_improve:${improve}`)
    if (vibrance > 0) parts.push(`e_vibrance:${vibrance}`)
    if (sharpen > 0) parts.push(`e_sharpen:${sharpen}`)
    if (brightness !== 0) parts.push(`e_brightness:${brightness}`)
    parts.push('w_900,c_limit,q_auto,f_auto')
    return `https://res.cloudinary.com/${cloudName}/image/upload/${parts.join('/')}/${publicId}`
  }

  async function resetCrop(publicId: string) {
    await fetch('/api/admin/save-crop', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId, reset: true }),
    })
    setPaintings(prev =>
      prev.map(p => {
        if (p.publicId !== publicId) return p
        const baseUrl = buildThumbnailUrl(publicId, undefined, p.colorSettings) + `?v=${Date.now()}`
        return { ...p, corners: undefined, crop: undefined, thumbnailUrl: baseUrl }
      })
    )
  }

  async function resetAllCrops() {
    if (!confirm(`Återställ beskärning på alla ${paintings.length} tavlor? De visas som originalbilder (med färgförbättring).`)) return
    for (const p of paintings) {
      await resetCrop(p.publicId)
    }
  }

  async function runAutoCropForPainting(p: GalleryPainting): Promise<Corners | null> {
    const res = await fetch('/api/admin/auto-crop', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId: p.publicId, originalWidth: p.originalWidth, originalHeight: p.originalHeight }),
    })
    if (!res.ok) return null
    return res.json()
  }

  async function saveCorners(publicId: string, corners: Corners) {
    await fetch('/api/admin/save-crop', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId, corners }),
    })
  }

  function applyCornersToPainting(publicId: string, corners: Corners) {
    setPaintings(prev =>
      prev.map(p => {
        if (p.publicId !== publicId) return p
        const newUrl = buildThumbnailUrl(publicId, corners, p.colorSettings) + `?v=${Date.now()}`
        return { ...p, corners, thumbnailUrl: newUrl }
      })
    )
  }

  async function autoCropAll() {
    if (!confirm(`Automatisk AI-beskärning för alla ${paintings.length} tavlor. Det tar ett tag. Fortsätta?`)) return
    setAutoCroppingAll(true)
    setAutoCropProgress({ done: 0, total: paintings.length })

    for (let i = 0; i < paintings.length; i++) {
      const p = paintings[i]
      try {
        const corners = await runAutoCropForPainting(p)
        if (corners) {
          await saveCorners(p.publicId, corners)
          applyCornersToPainting(p.publicId, corners)
        }
      } catch {
        // skip failed
      }
      setAutoCropProgress({ done: i + 1, total: paintings.length })
    }

    setAutoCroppingAll(false)
    setAutoCropProgress(null)
  }

  function handleCropSaved(corners: Corners) {
    if (!cropTarget) return
    applyCornersToPainting(cropTarget.publicId, corners)
    setCropTarget(null)
  }

  function handleColorSaved(colorSettings: ColorSettings) {
    if (!colorTarget) return
    const { publicId } = colorTarget
    setPaintings(prev =>
      prev.map(p => {
        if (p.publicId !== publicId) return p
        const newUrl = buildThumbnailUrl(publicId, p.corners, colorSettings) + `?v=${Date.now()}`
        return { ...p, colorSettings, thumbnailUrl: newUrl }
      })
    )
    setColorTarget(null)
  }

  function startEdit(p: GalleryPainting) {
    setEditing(prev => ({ ...prev, [p.publicId]: toEditState(p) }))
  }

  function cancelEdit(publicId: string) {
    setEditing(prev => {
      const next = { ...prev }
      delete next[publicId]
      return next
    })
  }

  async function savePainting(publicId: string) {
    const state = editing[publicId]
    if (!state) return
    setSaving(publicId)

    await fetch('/api/admin/update-painting', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId, ...state, price: state.price || null }),
    })

    setPaintings(prev =>
      prev.map(p =>
        p.publicId === publicId
          ? {
              ...p,
              title: state.title || undefined,
              price: state.price ? parseInt(state.price) : undefined,
              dimensions: state.dimensions || undefined,
              technique: state.technique || undefined,
              available: state.available,
              year: state.year ? parseInt(state.year) : undefined,
            }
          : p
      )
    )

    cancelEdit(publicId)
    setSaving(null)
  }

  async function deletePainting(publicId: string) {
    if (!confirm('Ta bort den här tavlan?')) return

    await fetch('/api/admin/delete-painting', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId }),
    })

    setPaintings(prev => prev.filter(p => p.publicId !== publicId))
  }

  async function fixOnePainting(publicId: string) {
    setProcessing(prev => new Set(prev).add(publicId))
    const newUrl = await processImage(publicId)
    if (newUrl) {
      const busted = `${newUrl}?v=${Date.now()}`
      setPaintings(prev =>
        prev.map(p => p.publicId === publicId ? { ...p, thumbnailUrl: busted, fullUrl: busted } : p)
      )
    }
    setProcessing(prev => { const s = new Set(prev); s.delete(publicId); return s })
  }

  async function fixAllPaintings() {
    setProcessingAll(true)
    for (const p of paintings) {
      await fixOnePainting(p.publicId)
    }
    setProcessingAll(false)
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)

    for (const file of Array.from(files)) {
      const sigRes = await fetch('/api/admin/get-signature', { credentials: 'include' })
      const { timestamp, signature, apiKey } = await sigRes.json()

      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', apiKey)
      formData.append('timestamp', String(timestamp))
      formData.append('signature', signature)
      formData.append('folder', 'paintings')

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.public_id) {
        const newPainting: GalleryPainting = {
          id: data.public_id,
          publicId: data.public_id,
          thumbnailUrl: data.secure_url,
          fullUrl: data.secure_url,
          available: true,
          originalWidth: data.width,
          originalHeight: data.height,
        }
        setPaintings(prev => [newPainting, ...prev])

        // Auto-crop with AI immediately after upload (in background — don't block next file)
        runAutoCropForPainting(newPainting).then(corners => {
          if (corners) {
            saveCorners(data.public_id, corners)
            applyCornersToPainting(data.public_id, corners)
          }
        })
      }
    }

    setUploading(false)
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  async function handleRevalidate() {
    setRevalidating(true)
    await fetch('/api/admin/revalidate', { method: 'POST', credentials: 'include' })
    setRevalidating(false)
    setRevalidated(true)
    setTimeout(() => setRevalidated(false), 3000)
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-serif text-xl">Christinas verk — Admin</h1>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm text-[#999]">{paintings.length} tavlor</span>
          <button
            onClick={resetAllCrops}
            disabled={autoCroppingAll || processingAll}
            className="text-sm border border-red-300 text-red-400 px-3 py-1.5 hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            ↺ Återställ alla
          </button>
          <button
            onClick={autoCropAll}
            disabled={autoCroppingAll || processingAll}
            className="text-sm border border-[#C4A35A] text-[#C4A35A] px-3 py-1.5 hover:bg-[#C4A35A] hover:text-white disabled:opacity-40 transition-colors"
          >
            {autoCroppingAll
              ? `✂ Beskär ${autoCropProgress?.done ?? 0}/${autoCropProgress?.total ?? 0}…`
              : '✂ Auto-beskär alla'}
          </button>
          <button
            onClick={fixAllPaintings}
            disabled={processingAll || autoCroppingAll}
            className="text-sm border border-[#CCC] px-3 py-1.5 hover:border-[#1C1C1C] disabled:opacity-40 transition-colors"
          >
            {processingAll ? 'Förbättrar…' : '✦ Förbättra alla bilder'}
          </button>
          <button
            onClick={handleRevalidate}
            disabled={revalidating}
            className={`text-sm px-3 py-1.5 border transition-colors disabled:opacity-40 ${
              revalidated
                ? 'border-green-400 text-green-600 bg-green-50'
                : 'border-[#1C1C1C] text-[#1C1C1C] hover:bg-[#1C1C1C] hover:text-white'
            }`}
          >
            {revalidating ? 'Publicerar…' : revalidated ? '✓ Publicerat' : '↑ Publicera sajten'}
          </button>
          <button onClick={handleLogout} className="text-sm text-[#999] hover:text-[#1C1C1C]">
            Logga ut
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload zone */}
        <div
          className="mb-10 border-2 border-dashed border-[#CCC] rounded p-10 text-center cursor-pointer hover:border-[#1C1C1C] transition-colors"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files) }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleUpload(e.target.files)}
          />
          {uploading ? (
            <p className="text-[#888]">Laddar upp och identifierar automatiskt med AI…</p>
          ) : (
            <>
              <p className="text-lg mb-1">Dra och släpp bilder här</p>
              <p className="text-sm text-[#888]">
                eller klicka för att välja — flera bilder åt gången
              </p>
              <p className="text-xs text-[#AAA] mt-2">
                AI identifierar och korrigerar perspektiv automatiskt efter uppladdning
              </p>
            </>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paintings.map(p => {
            const edit = editing[p.publicId]
            const isProcessing = processing.has(p.publicId)

            return (
              <div key={p.publicId} className="bg-white border border-[#E5E5E5] overflow-hidden">
                {/* Image */}
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.thumbnailUrl}
                    alt={p.title ?? 'Tavla'}
                    className={`w-full aspect-square object-cover transition-opacity ${isProcessing ? 'opacity-40' : ''}`}
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm text-[#555] bg-white/80 px-3 py-1 rounded">Förbättrar…</span>
                    </div>
                  )}
                  {/* Corner indicator */}
                  {p.corners && !isProcessing && (
                    <div className="absolute top-1.5 right-1.5 bg-[#C4A35A]/90 text-white text-[10px] px-1.5 py-0.5 rounded">
                      ✂ beskärd
                    </div>
                  )}
                </div>

                <div className="p-4">
                  {!edit ? (
                    <>
                      <p className="font-medium text-sm truncate mb-1">
                        {p.title || <span className="text-[#AAA] italic">Utan titel</span>}
                      </p>
                      <p className="text-xs text-[#888] mb-1">
                        {p.price ? `${p.price.toLocaleString('sv-SE')} kr` : 'Inget pris'}
                      </p>
                      <p className="text-xs text-[#888] mb-3">{p.dimensions || 'Inga mått'}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => startEdit(p)}
                          className="flex-1 border border-[#1C1C1C] text-xs py-1.5 hover:bg-[#1C1C1C] hover:text-white transition-colors"
                        >
                          Redigera
                        </button>
                        <button
                          onClick={() => setCropTarget(p)}
                          title="Beskär och räta upp"
                          className="border border-[#DDD] text-[#888] text-xs py-1.5 px-2 hover:border-[#C4A35A] hover:text-[#C4A35A] transition-colors"
                        >
                          ✂
                        </button>
                        <button
                          onClick={() => setColorTarget(p)}
                          title="Justera färger"
                          className={`border text-xs py-1.5 px-2 transition-colors ${
                            p.colorSettings
                              ? 'border-[#C4A35A] text-[#C4A35A] hover:bg-[#C4A35A]/10'
                              : 'border-[#DDD] text-[#888] hover:border-[#C4A35A] hover:text-[#C4A35A]'
                          }`}
                        >
                          🎨
                        </button>
                        {p.corners && (
                          <button
                            onClick={() => resetCrop(p.publicId)}
                            title="Återställ beskärning"
                            className="border border-[#DDD] text-[#AAA] text-xs py-1.5 px-2 hover:border-red-300 hover:text-red-400 transition-colors"
                          >
                            ↺
                          </button>
                        )}
                        <button
                          onClick={() => fixOnePainting(p.publicId)}
                          disabled={isProcessing}
                          title="Förbättra färger automatiskt"
                          className="border border-[#DDD] text-[#888] text-xs py-1.5 px-2 hover:border-[#1C1C1C] disabled:opacity-30 transition-colors"
                        >
                          ✦
                        </button>
                        <button
                          onClick={() => deletePainting(p.publicId)}
                          className="border border-[#DDD] text-[#AAA] text-xs py-1.5 px-2 hover:border-red-300 hover:text-red-400 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <input
                        placeholder="Titel"
                        value={edit.title}
                        onChange={e => setEditing(prev => ({ ...prev, [p.publicId]: { ...prev[p.publicId], title: e.target.value } }))}
                        className="w-full border border-[#DDD] px-2 py-1.5 text-xs focus:outline-none focus:border-[#1C1C1C]"
                      />
                      <input
                        placeholder="Pris (kr)"
                        type="number"
                        value={edit.price}
                        onChange={e => setEditing(prev => ({ ...prev, [p.publicId]: { ...prev[p.publicId], price: e.target.value } }))}
                        className="w-full border border-[#DDD] px-2 py-1.5 text-xs focus:outline-none focus:border-[#1C1C1C]"
                      />
                      <input
                        placeholder="Mått (t.ex. 60 × 80 cm)"
                        value={edit.dimensions}
                        onChange={e => setEditing(prev => ({ ...prev, [p.publicId]: { ...prev[p.publicId], dimensions: e.target.value } }))}
                        className="w-full border border-[#DDD] px-2 py-1.5 text-xs focus:outline-none focus:border-[#1C1C1C]"
                      />
                      <input
                        placeholder="Teknik (t.ex. Olja på pannå)"
                        value={edit.technique}
                        onChange={e => setEditing(prev => ({ ...prev, [p.publicId]: { ...prev[p.publicId], technique: e.target.value } }))}
                        className="w-full border border-[#DDD] px-2 py-1.5 text-xs focus:outline-none focus:border-[#1C1C1C]"
                      />
                      <input
                        placeholder="År (t.ex. 2024)"
                        value={edit.year}
                        onChange={e => setEditing(prev => ({ ...prev, [p.publicId]: { ...prev[p.publicId], year: e.target.value } }))}
                        className="w-full border border-[#DDD] px-2 py-1.5 text-xs focus:outline-none focus:border-[#1C1C1C]"
                      />
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={edit.available}
                          onChange={e => setEditing(prev => ({ ...prev, [p.publicId]: { ...prev[p.publicId], available: e.target.checked } }))}
                        />
                        Till salu
                      </label>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => savePainting(p.publicId)}
                          disabled={saving === p.publicId}
                          className="flex-1 bg-[#1C1C1C] text-white text-xs py-1.5 disabled:opacity-50"
                        >
                          {saving === p.publicId ? 'Sparar…' : 'Spara'}
                        </button>
                        <button
                          onClick={() => cancelEdit(p.publicId)}
                          className="border border-[#DDD] text-xs py-1.5 px-3"
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {cropTarget && (
        <CropModal
          painting={cropTarget}
          onSave={handleCropSaved}
          onClose={() => setCropTarget(null)}
        />
      )}

      {colorTarget && (
        <ColorModal
          painting={colorTarget}
          cloudName={cloudName}
          onSave={handleColorSaved}
          onClose={() => setColorTarget(null)}
        />
      )}
    </div>
  )
}
