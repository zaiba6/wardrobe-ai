import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ClothesLoader from './ClothesLoader'

const API = import.meta.env.VITE_API_URL ?? ''

function InspoCard({ item, selected, onToggle, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const detectedText = item.items_detected?.map(d => d.type).join(' · ')

  return (
    <div
      className="relative rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer"
      style={{
        backgroundColor: '#fff',
        borderColor: selected ? '#8B1A1A' : '#E3D9CE',
        boxShadow: selected ? '0 0 0 2px #8B1A1A' : 'none',
      }}
      onClick={() => onToggle(item.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Selection indicator */}
      <div
        className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
        style={{
          backgroundColor: selected ? '#8B1A1A' : 'rgba(250,247,242,0.85)',
          borderColor: selected ? '#8B1A1A' : '#E3D9CE',
        }}
      >
        {selected && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      <div className="aspect-square relative overflow-hidden" style={{ backgroundColor: '#F0EAE2' }}>
        <img src={`${API}${item.image_url}`} alt="inspo" className="w-full h-full object-cover" />
        {hovered && item.items_detected?.length > 0 && (
          <div className="absolute inset-0 flex flex-col justify-end p-3" style={{ backgroundColor: 'rgba(45,26,14,0.6)' }}>
            <p className="text-white text-xs leading-relaxed">{detectedText}</p>
          </div>
        )}
        {hovered && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(item.id) }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(250,247,242,0.9)', color: '#9B8E84' }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {item.style_notes && (
        <div className="px-3 py-2">
          <p className="text-xs italic line-clamp-2" style={{ color: '#9B8E84' }}>{item.style_notes}</p>
        </div>
      )}
    </div>
  )
}

function RecCard({ rec }) {
  return (
    <div className="rounded-2xl border p-4 space-y-2 transition-all" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="serif text-base capitalize" style={{ color: '#2D1A0E' }}>{rec.item_type}</h4>
        <span className="text-xs rounded-full px-2.5 py-0.5 shrink-0" style={{ backgroundColor: '#F0DADA', color: '#6B1010' }}>
          saved {rec.inspo_count}×
        </span>
      </div>
      <p className="text-xs" style={{ color: rec.owned_count > 0 ? '#9B8E84' : '#8B1A1A' }}>
        {rec.owned_count > 0 ? `you own ${rec.owned_count} similar piece${rec.owned_count > 1 ? 's' : ''}` : 'not in your closet yet'}
      </p>
      <p className="text-sm" style={{ color: '#4A3020' }}>{rec.suggestion}</p>
    </div>
  )
}

function OutfitItemTile({ item }) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-20">
      <div className="w-20 h-20 rounded-xl overflow-hidden" style={{ backgroundColor: '#F0EAE2' }}>
        <img src={`${API}${item.image_url}`} alt={item.type} className="w-full h-full object-cover" />
      </div>
      <p className="text-xs text-center capitalize leading-tight" style={{ color: '#4A3020' }}>
        {item.subtype || item.type}
      </p>
    </div>
  )
}

function weatherEmoji(condition) {
  if (!condition) return '🌤️'
  const c = condition.toLowerCase()
  if (c.includes('snow')) return '❄️'
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️'
  if (c.includes('thunder')) return '⛈️'
  if (c.includes('cloud')) return '☁️'
  if (c.includes('clear') || c.includes('sun')) return '☀️'
  return '🌤️'
}

export default function Inspo() {
  const [inspoItems, setInspoItems] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [uploading, setUploading] = useState(false)
  const [loadingInspo, setLoadingInspo] = useState(true)
  const [loadingRecs, setLoadingRecs] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // Selection state
  // Pinterest import state
  const [pinterestUrl, setPinterestUrl] = useState('')
  const [importing, setImporting]       = useState(false)
  const [importMsg, setImportMsg]       = useState(null)   // { ok: bool, text: str }

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Get-a-look panel state
  const [showLookPanel, setShowLookPanel] = useState(false)
  const [city, setCity] = useState('')
  const [coords, setCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [lookLoading, setLookLoading] = useState(false)
  const [lookResult, setLookResult] = useState(null)
  const [lookError, setLookError] = useState('')
  const [lookSaved, setLookSaved] = useState(false)

  const fetchInspo = async () => {
    setLoadingInspo(true)
    try { const res = await axios.get(`${API}/api/inspo`); setInspoItems(res.data) }
    finally { setLoadingInspo(false) }
  }

  const fetchRecs = async () => {
    setLoadingRecs(true)
    try { const res = await axios.get(`${API}/api/inspo/recommendations`); setRecommendations(res.data.recommendations || []) }
    finally { setLoadingRecs(false) }
  }

  useEffect(() => { fetchInspo(); fetchRecs() }, [])

  const [uploadStatus, setUploadStatus] = useState('')

  const handleUpload = async (files) => {
    const list = files instanceof FileList ? Array.from(files) : [files]
    if (!list.length) return
    setUploading(true)
    for (let i = 0; i < list.length; i++) {
      setUploadStatus(list.length > 1 ? `analyzing ${i + 1} of ${list.length}…` : 'analyzing your inspo…')
      try {
        const fd = new FormData()
        fd.append('image', list[i])
        const res = await axios.post(`${API}/api/inspo/upload`, fd)
        setInspoItems(p => [res.data, ...p])
      } catch {
        // continue
      }
    }
    fetchRecs()
    setUploading(false)
    setUploadStatus('')
  }

  const handlePinterestImport = async () => {
    if (!pinterestUrl.trim() || importing) return
    setImporting(true)
    setImportMsg(null)
    try {
      const res = await axios.post(`${API}/api/inspo/import-pinterest`, { board_url: pinterestUrl.trim() })
      setInspoItems(p => [...res.data.items, ...p])
      fetchRecs()
      setPinterestUrl('')
      setImportMsg({ ok: true, text: `imported ${res.data.imported} pins ✦` })
    } catch (err) {
      setImportMsg({ ok: false, text: err.response?.data?.detail || 'could not import board — make sure it\'s public' })
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async (id) => {
    await axios.delete(`${API}/api/inspo/${id}`)
    setInspoItems(p => p.filter(i => i.id !== id))
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
    fetchRecs()
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 10) {
        next.add(id)
      }
      return next
    })
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) { setLookError('Geolocation not supported — type your city.'); return }
    setLocating(true)
    setLookError('')
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setCity(''); setLocating(false) },
      () => { setLocating(false); setLookError('Could not get location — type your city.') }
    )
  }

  const handleGetLook = async () => {
    if (!city.trim() && !coords) { setLookError('add your location first'); return }
    setLookLoading(true)
    setLookError('')
    setLookResult(null)
    setLookSaved(false)
    try {
      const locationPayload = coords ? { lat: coords.lat, lon: coords.lon } : { city: city.trim() }
      const res = await axios.post(`${API}/api/outfit/from-inspo`, {
        inspo_ids: Array.from(selectedIds),
        ...locationPayload,
      })
      setLookResult(res.data)
    } catch (err) {
      setLookError(err.response?.data?.detail || 'something went wrong — try again')
    } finally {
      setLookLoading(false)
    }
  }

  const handleSaveLook = async () => {
    if (!lookResult) return
    try {
      await axios.post(`${API}/api/outfits/log`, {
        items: lookResult.outfit.items,
        occasion: 'inspo board look',
        weather_city: lookResult.weather?.city ?? null,
        weather_temp_c: lookResult.weather?.temp_celsius ?? null,
        weather_condition: lookResult.weather?.condition ?? null,
      })
      setLookSaved(true)
    } catch { /* silent */ }
  }

  const clearSelection = () => { setSelectedIds(new Set()); setShowLookPanel(false); setLookResult(null) }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h2 className="serif-italic text-3xl leading-snug" style={{ color: '#2D1A0E' }}>the inspo board</h2>
        <p className="text-sm mt-1" style={{ color: '#9B8E84' }}>
          save what inspires you — select up to 10 to get a look for today
        </p>
      </div>

      {/* Pinterest board import */}
      <div className="rounded-2xl border p-5 space-y-3" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
        <div className="flex items-center gap-2">
          {/* Pinterest P logo */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#E60023">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
          </svg>
          <p className="text-sm font-medium" style={{ color: '#2D1A0E' }}>link a Pinterest board</p>
        </div>
        <p className="text-xs" style={{ color: '#9B8E84' }}>paste a public board URL — we'll pull the pins and analyze your style</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={pinterestUrl}
            onChange={e => { setPinterestUrl(e.target.value); setImportMsg(null) }}
            onKeyDown={e => e.key === 'Enter' && handlePinterestImport()}
            placeholder="https://www.pinterest.com/you/your-board/"
            className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#8B1A1A]"
            style={{ borderColor: '#E3D9CE', color: '#2D1A0E', backgroundColor: '#FAF7F2' }}
            disabled={importing}
          />
          <button
            onClick={handlePinterestImport}
            disabled={importing || !pinterestUrl.trim()}
            className="shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-40 flex items-center gap-2"
            style={{ backgroundColor: '#E60023', color: '#fff' }}
          >
            {importing && <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />}
            {importing ? 'importing…' : 'import'}
          </button>
        </div>
        {importMsg && (
          <p className="text-xs" style={{ color: importMsg.ok ? '#7A9E7A' : '#8B1A1A' }}>
            {importMsg.text}
          </p>
        )}
        {importing && (
          <div className="flex items-center gap-2">
            <ClothesLoader />
            <p className="text-xs" style={{ color: '#9B8E84' }}>analyzing your pins — this takes ~30 seconds</p>
          </div>
        )}
      </div>

      {/* Upload */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${dragOver ? 'border-[#8B1A1A] bg-[#F0DADA]/30' : 'border-[#E3D9CE] hover:border-[#8B1A1A]/40'}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { handleUpload(e.target.files); e.target.value = '' }} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <ClothesLoader />
            <p className="text-sm" style={{ color: '#8B1A1A' }}>{uploadStatus}</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="serif-italic text-xl" style={{ color: '#9B8E84' }}>drop inspo here</p>
            <p className="text-xs tracking-wide" style={{ color: '#C4B5AC' }}>pinterest screenshots, editorials, anything</p>
          </div>
        )}
      </div>

      {/* Get-a-look panel (shown when items selected) */}
      {selectedIds.size > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#8B1A1A' }}>
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: '#F0DADA' }}>
            <p className="text-sm font-medium" style={{ color: '#6B1010' }}>
              {selectedIds.size} {selectedIds.size === 1 ? 'vibe' : 'vibes'} selected
              <span className="font-normal" style={{ color: '#9B6060' }}> · {10 - selectedIds.size} more</span>
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLookPanel(p => !p)}
                className="text-xs rounded-full px-4 py-1.5 font-medium transition-all"
                style={{ backgroundColor: '#8B1A1A', color: '#fff' }}
              >
                {showLookPanel ? 'hide' : 'get today\'s look →'}
              </button>
              <button onClick={clearSelection} className="text-xs" style={{ color: '#9B6060' }}>clear</button>
            </div>
          </div>

          {/* Expandable panel */}
          {showLookPanel && (
            <div className="p-5 space-y-4">
              {/* Location */}
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest" style={{ color: '#9B8E84' }}>your location</p>
                {coords ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-full px-3 py-1.5 border flex-1" style={{ borderColor: '#8B1A1A', backgroundColor: '#F0DADA' }}>
                      <span className="text-sm">📍</span>
                      <span className="text-xs" style={{ color: '#6B1010' }}>location detected</span>
                    </div>
                    <button onClick={() => setCoords(null)} className="text-xs rounded-full px-3 py-1.5 border" style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}>change ×</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleGetLocation}
                        disabled={locating}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs transition-all disabled:opacity-60 shrink-0"
                        style={{ borderColor: '#E3D9CE', color: '#9B8E84', backgroundColor: '#fff' }}
                      >
                        {locating ? <span className="w-3 h-3 rounded-full border border-[#E3D9CE] border-t-[#8B1A1A] animate-spin inline-block" /> : '📍'}
                        {locating ? 'locating…' : 'use my location'}
                      </button>
                      <span className="text-xs" style={{ color: '#C4B5AC' }}>or</span>
                    </div>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="type your city…"
                      className="w-full border-b-2 bg-transparent pb-2 text-sm focus:outline-none transition-all"
                      style={{ borderColor: city ? '#8B1A1A' : '#E3D9CE', color: '#2D1A0E' }}
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleGetLook}
                disabled={lookLoading || (!city.trim() && !coords)}
                className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-all disabled:opacity-40"
                style={{ backgroundColor: '#2D1A0E', color: '#FAF7F2' }}
              >
                {lookLoading && <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                {lookLoading ? 'styling from your vibes…' : 'style me →'}
              </button>

              {lookError && (
                <p className="text-sm rounded-xl px-4 py-3 border" style={{ color: '#6B1010', backgroundColor: '#F0DADA', borderColor: '#E8CECE' }}>
                  {lookError}
                </p>
              )}

              {/* Result */}
              {lookResult && !lookLoading && (
                <div className="rounded-2xl border p-4 space-y-4" style={{ borderColor: '#E3D9CE' }}>
                  {lookResult.weather && (
                    <div className="flex items-center gap-3 text-xs" style={{ color: '#9B8E84' }}>
                      <span>{weatherEmoji(lookResult.weather.condition)}</span>
                      <span>{lookResult.weather.city} · {Math.round(lookResult.weather.temp_fahrenheit)}°F</span>
                    </div>
                  )}
                  {lookResult.outfit?.reason && (
                    <p className="text-xs italic" style={{ color: '#9B8E84' }}>{lookResult.outfit.reason}</p>
                  )}
                  <div className="flex gap-3 flex-wrap">
                    {lookResult.outfit?.items?.map((item, i) => <OutfitItemTile key={item.id ?? i} item={item} />)}
                  </div>
                  <button
                    onClick={handleSaveLook}
                    disabled={lookSaved}
                    className="text-xs rounded-full px-4 py-1.5 border transition-all disabled:opacity-60"
                    style={lookSaved
                      ? { borderColor: '#7A9E7A', color: '#7A9E7A', backgroundColor: '#F0F7F0' }
                      : { borderColor: '#E3D9CE', color: '#9B8E84' }
                    }
                  >
                    {lookSaved ? 'saved to outfits worn ✓' : 'save this look ✦'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Capsule recommendations */}
      {!loadingRecs && recommendations.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="serif text-lg" style={{ color: '#2D1A0E' }}>your capsule gaps</h3>
            <p className="text-sm mt-0.5" style={{ color: '#9B8E84' }}>
              pieces you keep saving but don't own yet
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => <RecCard key={i} rec={rec} />)}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="space-y-4">
        {inspoItems.length > 0 && (
          <div className="flex items-center justify-between">
            <h3 className="serif text-lg" style={{ color: '#2D1A0E' }}>saved</h3>
            <span className="text-xs" style={{ color: '#9B8E84' }}>{inspoItems.length} images</span>
          </div>
        )}

        {loadingInspo ? (
          <div className="flex justify-center py-20">
            <ClothesLoader />
          </div>
        ) : inspoItems.length === 0 ? (
          <div className="text-center py-24 space-y-2">
            <p className="serif-italic text-2xl" style={{ color: '#C4B5AC' }}>nothing saved yet</p>
            <p className="text-sm" style={{ color: '#C4B5AC' }}>upload screenshots from pinterest, instagram, anywhere</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {inspoItems.map(item => (
              <InspoCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onToggle={toggleSelect}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
