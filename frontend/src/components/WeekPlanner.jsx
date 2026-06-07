import { useState } from 'react'
import axios from 'axios'
import ClothesLoader from './ClothesLoader'

const API = import.meta.env.VITE_API_URL ?? ''

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' }

const QUICK_FILL = ['work', 'gym', 'date night', 'going out', 'errands', 'wfh', 'brunch', 'travel']

function weatherEmoji(condition = '') {
  const c = condition.toLowerCase()
  if (c.includes('snow')) return '❄️'
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️'
  if (c.includes('cloud')) return '☁️'
  if (c.includes('clear') || c.includes('sun')) return '☀️'
  return '🌤️'
}

function getWeekDates() {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  return DAYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function OutfitMini({ items }) {
  if (!items?.length) return null
  return (
    <div className="flex gap-1 flex-wrap mt-1.5">
      {items.slice(0, 4).map((item, i) => (
        <div key={item.id ?? i} className="w-11 h-11 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: '#F0EAE2' }}>
          <img src={`${API}${item.image_url}`} alt={item.type} className="w-full h-full object-cover" />
        </div>
      ))}
      {items.length > 4 && (
        <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xs shrink-0" style={{ backgroundColor: '#F0EAE2', color: '#9B8E84' }}>
          +{items.length - 4}
        </div>
      )}
    </div>
  )
}

function DayCard({ day, date, occasion, onOccasionChange, outfitData, generated, expanded, onToggleExpand }) {
  // outfitData.outfits is an array — one outfit per sub-occasion
  const outfits = outfitData?.outfits ?? []
  const hasOutfit = outfits.length > 0
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div
      className="rounded-2xl border p-4 space-y-2 transition-all"
      style={{
        backgroundColor: hasOutfit ? '#fff' : '#FAF7F2',
        borderColor: hasOutfit ? '#D4C5C5' : '#E3D9CE',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: '#2D1A0E' }}>
            {DAY_SHORT[day]}
            <span className="text-xs font-normal ml-1.5" style={{ color: '#C4B5AC' }}>{dateLabel}</span>
          </p>
          {hasOutfit && outfits.length === 1 && (
            <p className="text-[11px] mt-0.5 truncate" style={{ color: '#9B8E84' }}>{outfits[0].occasion || occasion}</p>
          )}
          {hasOutfit && outfits.length > 1 && (
            <p className="text-[11px] mt-0.5 truncate" style={{ color: '#9B8E84' }}>{outfits.length} looks</p>
          )}
        </div>
        {hasOutfit && (
          <button onClick={onToggleExpand} className="text-[10px] shrink-0 mt-0.5" style={{ color: '#C4B5AC' }}>
            {expanded ? 'less' : 'details'}
          </button>
        )}
      </div>

      {hasOutfit ? (
        <div className="space-y-3">
          {outfits.map((outfit, i) => (
            <div key={i}>
              {outfits.length > 1 && (
                <p className="text-[10px] capitalize" style={{ color: '#C4B5AC' }}>{outfit.occasion}</p>
              )}
              <OutfitMini items={outfit.items} />
              {expanded && outfit.reason && (
                <p className="text-[11px] italic mt-1" style={{ color: '#9B8E84' }}>{outfit.reason}</p>
              )}
            </div>
          ))}
        </div>
      ) : generated ? (
        <p className="text-xs" style={{ color: '#C4B5AC' }}>no plan for today</p>
      ) : (
        <input
          value={occasion}
          onChange={e => onOccasionChange(e.target.value)}
          placeholder="what's going on?"
          className="w-full text-xs bg-transparent border-b focus:outline-none pb-1"
          style={{ borderColor: occasion ? '#8B1A1A' : '#E3D9CE', color: '#2D1A0E' }}
        />
      )}
    </div>
  )
}

export default function WeekPlanner() {
  const weekDates = getWeekDates()
  const [occasions, setOccasions]     = useState(Object.fromEntries(DAYS.map(d => [d, ''])))
  const [city, setCity]               = useState('')
  const [coords, setCoords]           = useState(null)
  const [locating, setLocating]       = useState(false)
  const [generating, setGenerating]   = useState(false)
  const [weekData, setWeekData]       = useState([])   // array of day objects with outfits[]
  const [weather, setWeather]         = useState(null)
  const [error, setError]             = useState('')
  const [generated, setGenerated]     = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)

  const handleGetLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported — type your city.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setCity(''); setLocating(false) },
      ()  => { setLocating(false); setError('Could not get location — type your city instead.') }
    )
  }

  const setOccasion = (day, val) => setOccasions(p => ({ ...p, [day]: val }))

  const handleGenerate = async () => {
    const days = DAYS.map((day, i) => ({
      date:     weekDates[i],
      day,
      events:   occasions[day] ? [occasions[day]] : [],
      occasion: occasions[day] || null,
    }))
    setGenerating(true)
    setError('')
    try {
      const locationPayload = coords
        ? { lat: coords.lat, lon: coords.lon }
        : city.trim() ? { city: city.trim() } : {}
      const res = await axios.post(`${API}/api/outfit/week-plan`, { days, ...locationPayload })
      setWeekData(res.data.week)
      setWeather(res.data.weather)
      setGenerated(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong — try again')
    } finally {
      setGenerating(false)
    }
  }

  const handleReset = () => {
    setGenerated(false)
    setWeekData([])
    setWeather(null)
    setError('')
    setExpandedDay(null)
    setOccasions(Object.fromEntries(DAYS.map(d => [d, ''])))
  }

  const hasLocation = coords || city.trim()
  const anyOccasion = DAYS.some(d => occasions[d])

  // After generation, merge weekData back to days for display
  const getOutfitData = (day) => weekData.find(w => w.day === day) ?? null

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="serif-italic text-3xl leading-snug" style={{ color: '#2D1A0E' }}>week planner</h2>
        <p className="text-sm mt-1" style={{ color: '#9B8E84' }}>
          {weather
            ? `${weatherEmoji(weather.description)} ${weather.city} · ${Math.round(weather.temp_fahrenheit)}°F this week`
            : "tell me what you have going on — i'll plan every look"
          }
        </p>
      </div>

      {/* Location */}
      {!generated && (
        <div className="rounded-xl border px-4 py-3 space-y-2" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: '#9B8E84' }}>your location this week</p>
          {coords ? (
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full border flex-1" style={{ borderColor: '#8B1A1A', backgroundColor: '#F0DADA', color: '#6B1010' }}>
                📍 location detected
              </span>
              <button onClick={() => setCoords(null)} className="text-xs" style={{ color: '#C4B5AC' }}>change ×</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleGetLocation}
                disabled={locating}
                className="text-xs rounded-full px-3 py-1.5 border shrink-0 flex items-center gap-1.5 disabled:opacity-60"
                style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}
              >
                {locating
                  ? <span className="w-3 h-3 rounded-full border border-[#E3D9CE] border-t-[#8B1A1A] animate-spin inline-block" />
                  : '📍'}
                {locating ? 'locating…' : 'my location'}
              </button>
              <span className="text-xs" style={{ color: '#C4B5AC' }}>or</span>
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="city…"
                className="flex-1 text-sm bg-transparent border-b focus:outline-none pb-1"
                style={{ borderColor: city ? '#8B1A1A' : '#E3D9CE', color: '#2D1A0E' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Day grid */}
      <div className="space-y-3">
        {!generated && (
          <p className="text-xs uppercase tracking-widest" style={{ color: '#9B8E84' }}>
            your week · you can type multiple events e.g. "gym and dinner"
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {DAYS.map((day, i) => (
            <div key={day} className="space-y-1.5">
              <DayCard
                day={day}
                date={weekDates[i]}
                occasion={occasions[day]}
                onOccasionChange={val => setOccasion(day, val)}
                outfitData={getOutfitData(day)}
                generated={generated}
                expanded={expandedDay === day}
                onToggleExpand={() => setExpandedDay(p => p === day ? null : day)}
              />
              {/* Quick fill chips — only before generation */}
              {!generated && (
                <div className="flex flex-wrap gap-1">
                  {QUICK_FILL.map(chip => (
                    <button
                      key={chip}
                      onClick={() => setOccasion(day, occasions[day] === chip ? '' : chip)}
                      className="text-[10px] px-2 py-0.5 rounded-full border transition-all"
                      style={{
                        borderColor: occasions[day] === chip ? '#8B1A1A' : '#E3D9CE',
                        backgroundColor: occasions[day] === chip ? '#F0DADA' : 'transparent',
                        color: occasions[day] === chip ? '#6B1010' : '#9B8E84',
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm rounded-xl px-4 py-3 border" style={{ color: '#6B1010', backgroundColor: '#F0DADA', borderColor: '#E8CECE' }}>
          {error}
        </p>
      )}

      {generating && (
        <div className="flex justify-center py-6">
          <ClothesLoader label="building your week…" />
        </div>
      )}

      {!generated ? (
        <button
          onClick={handleGenerate}
          disabled={generating || !hasLocation || !anyOccasion}
          className="flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-all disabled:opacity-40"
          style={{ backgroundColor: '#2D1A0E', color: '#FAF7F2' }}
        >
          {generating && <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
          {generating ? 'planning your week…' : 'plan my week →'}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-sm" style={{ color: '#7A9E7A' }}>week planned</p>
          <button
            onClick={handleReset}
            className="text-xs rounded-full px-3 py-1.5 border"
            style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}
          >
            start over
          </button>
        </div>
      )}
    </div>
  )
}
