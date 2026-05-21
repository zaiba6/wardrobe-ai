import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL ?? ''

const MOODS = [
  { key: 'comfy', label: 'Comfy', emoji: '🫂', subtext: 'Loose & cozy' },
  { key: 'casual', label: 'Casual', emoji: '👟', subtext: 'Everyday ease' },
  { key: 'confident', label: 'Confident', emoji: '💃', subtext: 'Show it off' },
  { key: 'flowy', label: 'Flowy', emoji: '🌸', subtext: 'Dreamy & soft' },
  { key: 'put-together', label: 'Put-together', emoji: '✨', subtext: 'Polished look' },
]

function weatherEmoji(condition) {
  if (!condition) return '🌤️'
  const c = condition.toLowerCase()
  if (c.includes('snow')) return '❄️'
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️'
  if (c.includes('thunder') || c.includes('storm')) return '⛈️'
  if (c.includes('cloud')) return '☁️'
  if (c.includes('clear') || c.includes('sun')) return '☀️'
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return '🌫️'
  if (c.includes('wind')) return '💨'
  return '🌤️'
}

function Spinner() {
  return <div className="w-5 h-5 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
}

function OutfitCard({ outfit }) {
  const items = outfit.items || []
  if (items.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
      {outfit.reason && (
        <p className="text-sm italic text-stone-500">{outfit.reason}</p>
      )}
      <div className="flex gap-3 flex-wrap">
        {items.map((item, i) => (
          <div key={item.id ?? i} className="flex flex-col items-center gap-1.5 w-20">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-100 shadow-sm">
              <img
                src={`${API}${item.image_url}`}
                alt={item.type}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs text-stone-600 text-center capitalize leading-tight">{item.type}</p>
            {item.color && (
              <p className="text-xs text-stone-400 text-center capitalize leading-tight">{item.color}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GetDressed() {
  const [mood, setMood] = useState(null)
  const [city, setCity] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!mood || !city.trim() || loading) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await axios.post(`${API}/api/outfit/suggest`, { mood, city: city.trim() })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const hasOutfits = result?.outfits && result.outfits.some((o) => o.items?.length > 0)

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl text-stone-800 mb-1">What are you wearing today?</h2>
        <p className="text-sm text-stone-400">Tell us your vibe and where you are — we'll pick your outfit.</p>
      </div>

      {/* Mood section */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-stone-600">How are you feeling?</label>
        <div className="flex flex-wrap gap-3">
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMood(m.key)}
              className={`flex flex-col items-center gap-1 rounded-2xl border px-4 py-3 w-28 cursor-pointer transition-all duration-200 ${
                mood === m.key
                  ? 'bg-rose-100 border-rose-400 text-rose-700 shadow-sm'
                  : 'bg-white border-stone-200 text-stone-600 hover:border-rose-200 hover:bg-rose-50/50'
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-sm font-medium leading-tight">{m.label}</span>
              <span className="text-xs text-stone-400 leading-tight text-center">{m.subtext}</span>
            </button>
          ))}
        </div>
      </div>

      {/* City input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-stone-600">Your city</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="e.g. Boston, MA"
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!mood || !city.trim() || loading}
        className="flex items-center justify-center gap-2 bg-rose-400 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full px-8 py-3 font-medium text-sm transition-all duration-200 shadow-sm"
      >
        {loading && <Spinner />}
        {loading ? 'Finding your outfit...' : 'Get my outfit'}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-rose-100 text-rose-600 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center py-12 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
          <p className="text-stone-400 text-sm">Finding your perfect outfit...</p>
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <div className="space-y-6">
          {/* Weather bar */}
          {result.weather && (
            <div className="bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-2xl">{weatherEmoji(result.weather.condition)}</span>
              <div>
                <p className="text-sm font-medium text-stone-700">{result.weather.city}</p>
                <p className="text-xs text-stone-400 capitalize">{result.weather.description || result.weather.condition}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-lg font-medium text-stone-700">
                  {result.weather.temp_fahrenheit !== undefined ? `${Math.round(result.weather.temp_fahrenheit)}°F` : ''}
                </p>
                <p className="text-xs text-stone-400">
                  {result.weather.temp_celsius !== undefined ? `${Math.round(result.weather.temp_celsius)}°C` : ''}
                </p>
              </div>
              {result.weather.humidity !== undefined && (
                <p className="text-xs text-stone-400 w-full">Humidity: {result.weather.humidity}%</p>
              )}
            </div>
          )}

          {/* Outfits */}
          {hasOutfits ? (
            <div className="space-y-4">
              <h3 className="text-lg text-stone-800">Here are your outfits for today:</h3>
              {result.outfits
                .filter((o) => o.items?.length > 0)
                .map((outfit, i) => (
                  <OutfitCard key={i} outfit={outfit} />
                ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <div className="text-3xl">👗</div>
              <p className="text-stone-500 font-medium">Not enough items yet</p>
              <p className="text-sm text-stone-400">Add more clothes to your wardrobe to get outfit suggestions!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
