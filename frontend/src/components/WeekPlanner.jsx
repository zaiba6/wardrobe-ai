import { useState, useEffect } from 'react'
import axios from 'axios'
import ClothesLoader from './ClothesLoader'

const API = import.meta.env.VITE_API_URL ?? ''

const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' }

function weatherEmoji(condition = '') {
  const c = condition.toLowerCase()
  if (c.includes('snow')) return '❄️'
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️'
  if (c.includes('cloud')) return '☁️'
  if (c.includes('clear') || c.includes('sun')) return '☀️'
  return '🌤️'
}

function OutfitMini({ items }) {
  if (!items?.length) return null
  return (
    <div className="flex gap-1.5 flex-wrap mt-2">
      {items.slice(0, 4).map((item, i) => (
        <div key={item.id ?? i} className="w-14 h-14 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: '#F0EAE2' }}>
          <img src={`${API}${item.image_url}`} alt={item.type} className="w-full h-full object-cover" />
        </div>
      ))}
      {items.length > 4 && (
        <div className="w-14 h-14 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: '#F0EAE2', color: '#9B8E84' }}>
          +{items.length - 4}
        </div>
      )}
    </div>
  )
}

function DayCard({ day, onOccasionChange }) {
  const hasEvents = day.events?.length > 0
  const hasOutfit = day.outfit?.items?.length > 0
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-2xl border p-4 space-y-2 transition-all"
      style={{
        backgroundColor: hasOutfit ? '#fff' : '#FAF7F2',
        borderColor: hasOutfit ? '#D4C5C5' : '#E3D9CE',
      }}
    >
      {/* Day header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium" style={{ color: '#2D1A0E' }}>
            {DAY_SHORT[day.day] ?? day.day}
            <span className="text-xs font-normal ml-1.5" style={{ color: '#C4B5AC' }}>
              {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </p>
          {hasEvents && (
            <div className="mt-0.5 space-y-0.5">
              {day.events.slice(0, 2).map((ev, i) => (
                <p key={i} className="text-[11px] truncate" style={{ color: '#9B8E84' }}>📅 {ev}</p>
              ))}
              {day.events.length > 2 && (
                <p className="text-[11px]" style={{ color: '#C4B5AC' }}>+{day.events.length - 2} more</p>
              )}
            </div>
          )}
        </div>
        {hasOutfit && (
          <button onClick={() => setExpanded(p => !p)} className="text-[10px] shrink-0 mt-0.5" style={{ color: '#C4B5AC' }}>
            {expanded ? 'less' : 'details'}
          </button>
        )}
      </div>

      {/* Outfit */}
      {hasOutfit ? (
        <>
          <OutfitMini items={day.outfit.items} />
          {expanded && day.outfit.reason && (
            <p className="text-[11px] italic" style={{ color: '#9B8E84' }}>{day.outfit.reason}</p>
          )}
        </>
      ) : day.needs_input ? (
        <input
          value={day.occasion || ''}
          onChange={e => onOccasionChange(day.date, e.target.value)}
          placeholder="what's going on?"
          className="w-full text-xs bg-transparent border-b focus:outline-none pb-1"
          style={{ borderColor: day.occasion ? '#8B1A1A' : '#E3D9CE', color: '#2D1A0E' }}
        />
      ) : (
        <p className="text-xs" style={{ color: '#C4B5AC' }}>generating…</p>
      )}
    </div>
  )
}

export default function WeekPlanner() {
  const [calConnected, setCalConnected]   = useState(null) // null = checking
  const [calDays, setCalDays]             = useState([])    // raw calendar data
  const [weekData, setWeekData]           = useState([])    // after outfit generation
  const [userOccasions, setUserOccasions] = useState({})   // {date: occasion text}
  const [loadingCal, setLoadingCal]       = useState(false)
  const [generating, setGenerating]       = useState(false)
  const [error, setError]                 = useState('')
  const [city, setCity]                   = useState('')
  const [coords, setCoords]               = useState(null)
  const [locating, setLocating]           = useState(false)
  const [weather, setWeather]             = useState(null)
  const [generated, setGenerated]         = useState(false)

  // Check if calendar is connected
  useEffect(() => {
    axios.get(`${API}/api/auth/calendar-status`)
      .then(r => setCalConnected(r.data.connected))
      .catch(() => setCalConnected(false))
  }, [])

  // Load calendar events once connected
  useEffect(() => {
    if (!calConnected) return
    setLoadingCal(true)
    axios.get(`${API}/api/calendar/week`)
      .then(r => {
        setCalDays(r.data.week)
        // Initialise userOccasions for empty days
        const init = {}
        r.data.week.forEach(d => { if (!d.events?.length) init[d.date] = '' })
        setUserOccasions(init)
      })
      .catch(() => setError('Could not load your calendar — try reconnecting.'))
      .finally(() => setLoadingCal(false))
  }, [calConnected])

  const handleGetLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported — type your city.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setCity(''); setLocating(false) },
      ()  => { setLocating(false); setError('Could not get location — type your city.') }
    )
  }

  const handleGenerate = async () => {
    const days = calDays.map(d => ({
      date:     d.date,
      day:      d.day,
      events:   d.events || [],
      occasion: userOccasions[d.date] || null,
    }))
    setGenerating(true)
    setError('')
    setGenerated(false)
    try {
      const locationPayload = coords ? { lat: coords.lat, lon: coords.lon } : city ? { city } : {}
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

  // Merge generated outfits back into calendar days for display
  const displayDays = generated
    ? calDays.map(d => {
        const gen = weekData.find(w => w.date === d.date)
        return gen ? { ...d, ...gen, occasion: userOccasions[d.date] || gen.occasion } : { ...d, needs_input: !d.events?.length }
      })
    : calDays.map(d => ({ ...d, needs_input: !d.events?.length, outfit: null }))

  const hasLocation = coords || city.trim()

  // ── Not connected ──
  if (calConnected === null) {
    return (
      <div className="flex justify-center py-24">
        <ClothesLoader />
      </div>
    )
  }

  if (!calConnected) {
    return (
      <div className="space-y-8 max-w-2xl">
        <div>
          <h2 className="serif-italic text-3xl leading-snug" style={{ color: '#2D1A0E' }}>week planner</h2>
          <p className="text-sm mt-1" style={{ color: '#9B8E84' }}>connect your Google Calendar to plan your outfits for the week</p>
        </div>
        <div className="rounded-2xl border p-8 flex flex-col items-center gap-5 text-center" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: '#F0EAE2' }}>📅</div>
          <div>
            <p className="font-medium" style={{ color: '#2D1A0E' }}>connect Google Calendar</p>
            <p className="text-sm mt-1" style={{ color: '#9B8E84' }}>we'll read your week's events and plan outfits around them</p>
          </div>
          <a
            href={`${API}/api/auth/connect-calendar`}
            className="rounded-full px-6 py-2.5 text-sm font-medium transition-all"
            style={{ backgroundColor: '#2D1A0E', color: '#FAF7F2' }}
          >
            connect Google Calendar →
          </a>
          <p className="text-xs" style={{ color: '#C4B5AC' }}>read-only access · we never modify your calendar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="serif-italic text-3xl leading-snug" style={{ color: '#2D1A0E' }}>week planner</h2>
        <p className="text-sm mt-1" style={{ color: '#9B8E84' }}>
          {weather
            ? `${weatherEmoji(weather.description)} ${weather.city} · ${Math.round(weather.temp_fahrenheit)}°F this week`
            : 'outfits planned around your calendar — every look unique'
          }
        </p>
      </div>

      {/* Location */}
      {!generated && (
        <div className="rounded-xl border px-4 py-3 space-y-2" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: '#9B8E84' }}>your location this week</p>
          {coords ? (
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full border flex-1" style={{ borderColor: '#8B1A1A', backgroundColor: '#F0DADA', color: '#6B1010' }}>📍 location detected</span>
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
                {locating ? <span className="w-3 h-3 rounded-full border border-[#E3D9CE] border-t-[#8B1A1A] animate-spin inline-block" /> : '📍'}
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

      {/* Loading calendar */}
      {loadingCal && (
        <div className="flex justify-center py-12"><ClothesLoader label="loading your week…" /></div>
      )}

      {/* Week grid */}
      {!loadingCal && displayDays.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {displayDays.map(day => (
              <DayCard
                key={day.date}
                day={day}
                onOccasionChange={(date, val) => setUserOccasions(p => ({ ...p, [date]: val }))}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm rounded-xl px-4 py-3 border" style={{ color: '#6B1010', backgroundColor: '#F0DADA', borderColor: '#E8CECE' }}>
              {error}
            </p>
          )}

          {!generated ? (
            <button
              onClick={handleGenerate}
              disabled={generating || !hasLocation}
              className="flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-all disabled:opacity-40"
              style={{ backgroundColor: '#2D1A0E', color: '#FAF7F2' }}
            >
              {generating && <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
              {generating ? 'planning your week…' : 'plan my week →'}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm" style={{ color: '#7A9E7A' }}>✓ week planned</p>
              <button
                onClick={() => { setGenerated(false); setWeekData([]) }}
                className="text-xs rounded-full px-3 py-1.5 border"
                style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}
              >
                regenerate
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state — no calendar days */}
      {!loadingCal && displayDays.length === 0 && calConnected && (
        <div className="text-center py-16 space-y-2">
          <p className="serif-italic text-xl" style={{ color: '#C4B5AC' }}>calendar loaded, no events this week</p>
          <p className="text-sm" style={{ color: '#C4B5AC' }}>add events in Google Calendar and come back</p>
        </div>
      )}
    </div>
  )
}
