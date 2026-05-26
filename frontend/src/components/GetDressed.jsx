import { useState } from 'react'
import axios from 'axios'
import ClothesLoader from './ClothesLoader'

const API = import.meta.env.VITE_API_URL ?? ''

async function saveOutfitLog({ items, mood, occasion, weather }) {
  try {
    await axios.post(`${API}/api/outfits/log`, {
      items,
      mood,
      occasion: occasion || null,
      weather_city:      weather?.city      ?? null,
      weather_temp_c:    weather?.temp_celsius ?? null,
      weather_condition: weather?.condition  ?? null,
    })
    return true
  } catch {
    return false
  }
}

const MOODS = [
  { key: 'Comfy',        label: 'comfy',         sub: 'loose & cozy',      emoji: '🫂' },
  { key: 'Casual',       label: 'casual',        sub: 'everyday ease',     emoji: '👟' },
  { key: 'Confident',    label: 'confident',     sub: 'show it off',       emoji: '💃' },
  { key: 'Flowy',        label: 'flowy',         sub: 'dreamy & soft',     emoji: '🌸' },
  { key: 'Put-together', label: 'put-together',  sub: 'polished look',     emoji: '✨' },
]

const PRESET_OCCASIONS = [
  { label: 'work',       value: 'office look, business casual, polished — no jeans, no sneakers' },
  { label: 'date night', value: 'date night, romantic and elegant, slightly dressed up' },
  { label: 'going out',  value: 'night out, going out, fun and confident, statement look' },
  { label: 'weekend',    value: 'casual weekend, comfy but cute, running errands' },
  { label: 'gym',        value: 'gym day, athletic, sporty and functional' },
]

function weatherEmoji(condition) {
  if (!condition) return '🌤️'
  const c = condition.toLowerCase()
  if (c.includes('snow')) return '❄️'
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️'
  if (c.includes('thunder')) return '⛈️'
  if (c.includes('cloud')) return '☁️'
  if (c.includes('clear') || c.includes('sun')) return '☀️'
  if (c.includes('fog') || c.includes('mist')) return '🌫️'
  return '🌤️'
}

function WeatherStrip({ weather }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl px-5 py-4 border" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
      <span className="text-2xl">{weatherEmoji(weather.condition)}</span>
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: '#2D1A0E' }}>{weather.city}</p>
        <p className="text-xs capitalize" style={{ color: '#9B8E84' }}>{weather.description}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-medium" style={{ color: '#2D1A0E' }}>{Math.round(weather.temp_fahrenheit)}°F</p>
        <p className="text-xs" style={{ color: '#9B8E84' }}>{Math.round(weather.temp_celsius)}°C</p>
      </div>
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
      {item.color && (
        <p className="text-[10px] text-center capitalize leading-tight" style={{ color: '#9B8E84' }}>{item.color}</p>
      )}
    </div>
  )
}

function EmptyOutfit() {
  return (
    <div className="text-center py-12 space-y-2">
      <p className="serif-italic text-xl" style={{ color: '#C4B5AC' }}>not enough pieces yet</p>
      <p className="text-sm" style={{ color: '#C4B5AC' }}>add more to your closet to get outfit suggestions</p>
    </div>
  )
}

function OutfitCard({ outfit, mood, occasion, weather, onRefresh, onBadRec, refreshing }) {
  const [saved, setSaved]   = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const ok = await saveOutfitLog({ items: outfit.items, mood, occasion, weather })
    setSaving(false)
    if (ok) setSaved(true)
  }

  return (
    <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
      {outfit.reason && (
        <p className="text-xs italic" style={{ color: '#9B8E84' }}>{outfit.reason}</p>
      )}
      <div className="flex gap-3 flex-wrap">
        {outfit.items.map((item, j) => (
          <OutfitItemTile key={item.id ?? j} item={item} />
        ))}
      </div>
      <div className="flex items-center gap-3 pt-1 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saved || saving}
          className="text-xs rounded-full px-4 py-1.5 border transition-all disabled:opacity-60"
          style={saved
            ? { borderColor: '#7A9E7A', color: '#7A9E7A', backgroundColor: '#F0F7F0' }
            : { borderColor: '#E3D9CE', color: '#9B8E84' }
          }
        >
          {saved ? 'saved to outfits worn ✓' : saving ? 'saving…' : 'save this look ✦'}
        </button>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-xs rounded-full px-4 py-1.5 border transition-all disabled:opacity-60 flex items-center gap-1.5"
          style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}
        >
          {refreshing && <span className="w-2.5 h-2.5 rounded-full border border-[#E3D9CE] border-t-[#8B1A1A] animate-spin inline-block" />}
          {refreshing ? 'finding another…' : 'try another →'}
        </button>
        <button
          onClick={onBadRec}
          disabled={refreshing}
          className="text-xs rounded-full px-4 py-1.5 border transition-all disabled:opacity-60 flex items-center gap-1.5"
          style={{ borderColor: '#E8CECE', color: '#8B1A1A', backgroundColor: '#FDF5F5' }}
          title="Tell the algo this combo doesn't work"
        >
          👎 bad rec
        </button>
      </div>
    </div>
  )
}

export default function GetDressed() {
  const [occasion, setOccasion] = useState('')
  const [moodKey, setMoodKey]   = useState(null)
  const [moodText, setMoodText] = useState('')
  const [city, setCity]         = useState('')
  const [coords, setCoords]     = useState(null)
  const [locating, setLocating] = useState(false)
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]       = useState('')
  const [excludeIds, setExcludeIds] = useState([])

  const mood        = moodText.trim() || moodKey
  const hasLocation = coords !== null || city.trim().length > 0
  const canSubmit   = mood && hasLocation && !loading && !refreshing

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser — type your city instead.')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setCity(''); setLocating(false) },
      ()    => { setLocating(false); setError('Could not get your location — please type your city instead.') }
    )
  }

  const _fetch = async (excludeList) => {
    const locationPayload = coords
      ? { lat: coords.lat, lon: coords.lon }
      : { city: city.trim() }
    const res = await axios.post(`${API}/api/outfit/suggest`, {
      mood,
      occasion: occasion.trim() || null,
      exclude_ids: excludeList,
      ...locationPayload,
    })
    return res.data
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    setResult(null)
    setExcludeIds([])
    try {
      const data = await _fetch([])
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'something went wrong — try again')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!result) return
    const currentIds  = result.outfit?.items?.map(i => i.id) ?? []
    const newExclude  = [...excludeIds, ...currentIds]
    setExcludeIds(newExclude)
    setRefreshing(true)
    setError('')
    try {
      const data = await _fetch(newExclude)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'something went wrong — try again')
    } finally {
      setRefreshing(false)
    }
  }

  const handleBadRec = async () => {
    if (!result?.outfit?.items?.length) return
    const currentIds = result.outfit.items.map(i => i.id)
    // Fire-and-forget the feedback — don't block the refresh
    axios.post(`${API}/api/outfit/feedback`, {
      item_ids: currentIds,
      occasion: occasion || null,
      feedback: 'bad',
    }).catch(() => {})
    // Then refresh like normal but exclude these items too
    handleRefresh()
  }

  const hasOutfit = result?.outfit?.items?.length > 0

  return (
    <div className="space-y-10 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="serif-italic text-3xl leading-snug" style={{ color: '#2D1A0E' }}>
          so, what are we wearing?
        </h2>
        <p className="text-sm mt-1" style={{ color: '#9B8E84' }}>
          tell me the plan, the vibe, and where you are
        </p>
      </div>

      {/* 1 — Occasion */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: '#9B8E84' }}>
          occasion <span style={{ color: '#C4B5AC', textTransform: 'none', letterSpacing: 'normal' }}>— optional</span>
        </p>
        <div className="flex gap-2 flex-wrap">
          {PRESET_OCCASIONS.map(p => (
            <button
              key={p.label}
              onClick={() => setOccasion(occasion === p.value ? '' : p.value)}
              className="text-xs rounded-full px-3 py-1.5 border transition-all"
              style={occasion === p.value
                ? { backgroundColor: '#F0DADA', borderColor: '#8B1A1A', color: '#6B1010' }
                : { backgroundColor: '#fff', borderColor: '#E3D9CE', color: '#9B8E84' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={occasion}
          onChange={e => setOccasion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="or describe the vibe… beach day, baby shower, etc."
          className="w-full border-b-2 bg-transparent pb-2 text-sm focus:outline-none transition-all"
          style={{ borderColor: occasion ? '#8B1A1A' : '#E3D9CE', color: '#2D1A0E' }}
        />
        {occasion && (
          <p className="text-xs" style={{ color: '#C4B5AC' }}>
            ✦ i'll pick specific pieces from your closet for this look
          </p>
        )}
      </div>

      {/* 2 — Mood */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: '#9B8E84' }}>how are you feeling today</p>
        <div className="flex gap-3 flex-wrap">
          {MOODS.map(m => (
            <button
              key={m.key}
              onClick={() => { setMoodKey(moodKey === m.key ? null : m.key); setMoodText('') }}
              className="flex flex-col items-center gap-1.5 rounded-2xl border px-4 py-3.5 w-[5.5rem] transition-all duration-200 text-center"
              style={moodKey === m.key && !moodText
                ? { backgroundColor: '#F0DADA', borderColor: '#8B1A1A', color: '#6B1010' }
                : { backgroundColor: '#fff', borderColor: '#E3D9CE', color: '#9B8E84' }
              }
            >
              <span className="text-xl">{m.emoji}</span>
              <span className="text-xs font-medium leading-tight">{m.label}</span>
              <span className="text-[10px] leading-tight" style={{ color: moodKey === m.key && !moodText ? '#8B1A1A' : '#C4B5AC' }}>{m.sub}</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          value={moodText}
          onChange={e => { setMoodText(e.target.value); setMoodKey(null) }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="or describe how you feel… super bloated, super confident, chaotic…"
          className="w-full border-b-2 bg-transparent pb-2 text-sm focus:outline-none transition-all"
          style={{ borderColor: moodText ? '#8B1A1A' : '#E3D9CE', color: '#2D1A0E' }}
        />
      </div>

      {/* 3 — Location */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: '#9B8E84' }}>your location</p>
        {coords ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 border flex-1" style={{ borderColor: '#8B1A1A', backgroundColor: '#F0DADA' }}>
              <span className="text-sm">📍</span>
              <span className="text-xs" style={{ color: '#6B1010' }}>location detected</span>
            </div>
            <button onClick={() => setCoords(null)} className="text-xs rounded-full px-3 py-1.5 border transition-all" style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}>
              change ×
            </button>
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
                {locating
                  ? <span className="w-3 h-3 rounded-full border border-[#E3D9CE] border-t-[#8B1A1A] animate-spin inline-block" />
                  : '📍'
                }
                {locating ? 'locating…' : 'use my location'}
              </button>
              <span className="text-xs" style={{ color: '#C4B5AC' }}>or</span>
            </div>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="type your city…"
              className="w-full border-b-2 bg-transparent pb-2 text-sm focus:outline-none transition-all"
              style={{ borderColor: city ? '#8B1A1A' : '#E3D9CE', color: '#2D1A0E' }}
            />
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-all disabled:opacity-40"
        style={{ backgroundColor: '#2D1A0E', color: '#FAF7F2' }}
      >
        {loading && <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
        {loading ? 'finding your look…' : 'dress me →'}
      </button>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-8">
          <ClothesLoader label="styling your outfit…" />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm rounded-xl px-4 py-3 border" style={{ color: '#6B1010', backgroundColor: '#F0DADA', borderColor: '#E8CECE' }}>
          {error}
        </p>
      )}

      {/* Result */}
      {!loading && result && (
        <div className="space-y-6">
          {result.weather && <WeatherStrip weather={result.weather} />}
          {hasOutfit ? (
            <OutfitCard
              outfit={result.outfit}
              mood={mood}
              occasion={occasion}
              weather={result.weather}
              onRefresh={handleRefresh}
              onBadRec={handleBadRec}
              refreshing={refreshing}
            />
          ) : (
            <EmptyOutfit />
          )}
        </div>
      )}
    </div>
  )
}
