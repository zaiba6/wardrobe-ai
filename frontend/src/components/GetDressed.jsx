import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL ?? ''

const MOODS = [
  { key: 'Comfy',        label: 'comfy',         sub: 'loose & cozy',      emoji: '🫂' },
  { key: 'Casual',       label: 'casual',        sub: 'everyday ease',     emoji: '👟' },
  { key: 'Confident',    label: 'confident',     sub: 'show it off',       emoji: '💃' },
  { key: 'Flowy',        label: 'flowy',         sub: 'dreamy & soft',     emoji: '🌸' },
  { key: 'Put-together', label: 'put-together',  sub: 'polished look',     emoji: '✨' },
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
        <p className="text-sm font-medium" style={{ color: '#1C1917' }}>{weather.city}</p>
        <p className="text-xs capitalize" style={{ color: '#9B8E84' }}>{weather.description}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-medium" style={{ color: '#1C1917' }}>
          {Math.round(weather.temp_fahrenheit)}°F
        </p>
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
      <p className="text-xs text-center capitalize leading-tight" style={{ color: '#6B5E57' }}>
        {item.subtype || item.type}
      </p>
      {item.color && (
        <p className="text-[10px] text-center capitalize leading-tight" style={{ color: '#9B8E84' }}>{item.color}</p>
      )}
    </div>
  )
}

export default function GetDressed() {
  const [mood, setMood] = useState(null)
  const [city, setCity] = useState('')
  const [occasion, setOccasion] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isVibeMode = occasion.trim().length > 0

  const handleSubmit = async () => {
    if (!mood || !city.trim() || loading) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      if (isVibeMode) {
        const res = await axios.post(`${API}/api/outfit/vibe`, {
          vibe: occasion.trim(),
          city: city.trim(),
          mood,
        })
        setResult({ ...res.data, mode: 'vibe' })
      } else {
        const res = await axios.post(`${API}/api/outfit/suggest`, { mood, city: city.trim() })
        setResult({ ...res.data, mode: 'mood' })
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'something went wrong — try again')
    } finally {
      setLoading(false)
    }
  }

  const hasOutfits = result?.mode === 'mood'
    ? result?.outfits?.some(o => o.items?.length > 0)
    : result?.outfit?.items?.length > 0

  return (
    <div className="space-y-10 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="serif-italic text-3xl leading-snug" style={{ color: '#1C1917' }}>
          so, what are we wearing?
        </h2>
        <p className="text-sm mt-1" style={{ color: '#9B8E84' }}>
          tell me your vibe and where you are
        </p>
      </div>

      {/* Mood */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: '#9B8E84' }}>how are you feeling today</p>
        <div className="flex gap-3 flex-wrap">
          {MOODS.map(m => (
            <button
              key={m.key}
              onClick={() => setMood(m.key)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border px-4 py-3.5 w-[5.5rem] transition-all duration-200 text-center"
              style={mood === m.key
                ? { backgroundColor: '#EED9D5', borderColor: '#B5756A', color: '#8B4A42' }
                : { backgroundColor: '#fff', borderColor: '#E3D9CE', color: '#9B8E84' }
              }
            >
              <span className="text-xl">{m.emoji}</span>
              <span className="text-xs font-medium leading-tight">{m.label}</span>
              <span className="text-[10px] leading-tight" style={{ color: mood === m.key ? '#B5756A' : '#C4B5AC' }}>{m.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* City */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest" style={{ color: '#9B8E84' }}>your city</p>
        <input
          type="text"
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="e.g. Boston, New York, London…"
          className="w-full border-b-2 bg-transparent pb-2 text-sm focus:outline-none transition-all"
          style={{ borderColor: city ? '#B5756A' : '#E3D9CE', color: '#1C1917' }}
        />
      </div>

      {/* Occasion (optional — activates AI styling) */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest" style={{ color: '#9B8E84' }}>
          occasion <span style={{ color: '#C4B5AC', textTransform: 'none', letterSpacing: 'normal' }}>— optional</span>
        </p>
        <input
          type="text"
          value={occasion}
          onChange={e => setOccasion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="office meeting, dinner date, beach day…"
          className="w-full border-b-2 bg-transparent pb-2 text-sm focus:outline-none transition-all"
          style={{ borderColor: occasion ? '#B5756A' : '#E3D9CE', color: '#1C1917' }}
        />
        {isVibeMode && (
          <p className="text-xs" style={{ color: '#C4B5AC' }}>
            ✦ i'll pick specific pieces from your closet for this look
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!mood || !city.trim() || loading}
        className="flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-all disabled:opacity-40"
        style={{ backgroundColor: '#1C1917', color: '#FAF7F2' }}
      >
        {loading && <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
        {loading ? 'finding your look…' : isVibeMode ? 'style my outfit →' : 'dress me →'}
      </button>

      {/* Error */}
      {error && (
        <p className="text-sm rounded-xl px-4 py-3 border" style={{ color: '#8B4A42', backgroundColor: '#EED9D5', borderColor: '#E3C5BF' }}>
          {error}
        </p>
      )}

      {/* Results */}
      {!loading && result && (
        <div className="space-y-6">
          {result.weather && <WeatherStrip weather={result.weather} />}

          {result.mode === 'vibe' ? (
            /* AI-picked specific outfit */
            <div className="space-y-4">
              <p className="serif text-lg" style={{ color: '#1C1917' }}>
                styled for <em>{occasion}</em> —
              </p>
              {hasOutfits ? (
                <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
                  {result.outfit.reason && (
                    <p className="text-xs italic" style={{ color: '#9B8E84' }}>{result.outfit.reason}</p>
                  )}
                  <div className="flex gap-3 flex-wrap">
                    {result.outfit.items.map((item, j) => (
                      <OutfitItemTile key={item.id ?? j} item={item} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-2">
                  <p className="serif-italic text-xl" style={{ color: '#C4B5AC' }}>not enough pieces yet</p>
                  <p className="text-sm" style={{ color: '#C4B5AC' }}>add more to your closet to get outfit suggestions</p>
                </div>
              )}
            </div>
          ) : (
            /* Mood-based outfits */
            hasOutfits ? (
              <div className="space-y-4">
                <p className="serif text-lg" style={{ color: '#1C1917' }}>here's what i'd wear —</p>
                {result.outfits.filter(o => o.items?.length > 0).map((outfit, i) => (
                  <div key={i} className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
                    {outfit.reason && (
                      <p className="text-xs italic" style={{ color: '#9B8E84' }}>{outfit.reason}</p>
                    )}
                    <div className="flex gap-3 flex-wrap">
                      {outfit.items.map((item, j) => (
                        <OutfitItemTile key={item.id ?? j} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-2">
                <p className="serif-italic text-xl" style={{ color: '#C4B5AC' }}>not enough pieces yet</p>
                <p className="text-sm" style={{ color: '#C4B5AC' }}>add more to your closet to get outfit suggestions</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
