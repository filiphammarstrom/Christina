'use client'

import { useState, useRef } from 'react'
import type { GalleryPainting } from '@/types/painting'

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
  const fileRef = useRef<HTMLInputElement>(null)

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId }),
    })

    setPaintings(prev => prev.filter(p => p.publicId !== publicId))
  }

  async function fixOnePainting(publicId: string) {
    setProcessing(prev => new Set(prev).add(publicId))
    const newUrl = await processImage(publicId)
    if (newUrl) {
      // Add cache-bust so img src actually refreshes
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
      const sigRes = await fetch('/api/admin/get-signature')
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
        }
        setPaintings(prev => [newPainting, ...prev])

        // Auto-fix immediately after upload
        await fixOnePainting(data.public_id)
      }
    }

    setUploading(false)
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-serif text-xl">Christinas verk — Admin</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#999]">{paintings.length} tavlor</span>
          <button
            onClick={fixAllPaintings}
            disabled={processingAll}
            className="text-sm border border-[#CCC] px-3 py-1.5 hover:border-[#1C1C1C] disabled:opacity-40 transition-colors"
          >
            {processingAll ? 'Förbättrar…' : '✦ Förbättra alla bilder'}
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
            <p className="text-[#888]">Laddar upp och förbättrar automatiskt…</p>
          ) : (
            <>
              <p className="text-lg mb-1">Dra och släpp bilder här</p>
              <p className="text-sm text-[#888]">
                eller klicka för att välja — flera bilder åt gången
              </p>
              <p className="text-xs text-[#AAA] mt-2">
                Färger, skärpa och beskärning förbättras automatiskt
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(p)}
                          className="flex-1 border border-[#1C1C1C] text-xs py-1.5 hover:bg-[#1C1C1C] hover:text-white transition-colors"
                        >
                          Redigera
                        </button>
                        <button
                          onClick={() => fixOnePainting(p.publicId)}
                          disabled={isProcessing}
                          title="Förbättra bild automatiskt"
                          className="border border-[#DDD] text-[#888] text-xs py-1.5 px-2.5 hover:border-[#1C1C1C] disabled:opacity-30 transition-colors"
                        >
                          ✦
                        </button>
                        <button
                          onClick={() => deletePainting(p.publicId)}
                          className="border border-[#DDD] text-[#AAA] text-xs py-1.5 px-2.5 hover:border-red-300 hover:text-red-400 transition-colors"
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
    </div>
  )
}
