import { useState } from 'react'
import axios from 'axios'
import ClothesLoader from './ClothesLoader'

const API = import.meta.env.VITE_API_URL ?? ''

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' }
const QUICK_FILL = ['work', 'gym', 'date night', 'going out', 'errands', 'wfh', 'brunch', 'travel', 'drinks', 'dinner']

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

function outfitLine(items) {
  return items.map(item => item.subtype || item.type).join(' + ')
}

function DayCard({ day, date, tags, onAddTag, onRemoveTag, outfitData, generated, onFocus }) {
  const [inputVal, setInputVal] = useState('')
  const outfits  = outfitData?.outfits ?? []
  const hasOutfit = outfits.length > 0
  const today    = new Date().toISOString().slice(0, 10)
  const isToday  = date === today
  const dateObj  = new Date(date + 'T12:00:00')
  const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const commit = () => {
    const val = inputVal.trim()
    if (!val) return
    val.split(',').map(s => s.trim()).filter(Boolean).forEach(onAddTag)
    setInputVal('')
  }

  return (
    <div
      className="rounded-xl border flex flex-col overflow-hidden"
      style={{
        backgroundColor: '#fff',
        borderColor: isToday ? '#C4A8A8' : hasOutfit ? '#D4C5C5' : '#E3D9CE',
        minHeight: '120px',
      }}
    >
      {/* Day header */}
      <div
        className="px-2 pt-2 pb-1 border-b shrink-0"
        style={{
          borderColor: isToday ? '#C4A8A8' : '#E3D9CE',
          backgroundColor: isToday ? '#F5E8E8' : 'transparent',
        }}
      >
        <p className="text-[11px] font-semibold" style={{ color: '#2D1A0E' }}>{DAY_SHORT[day]}</p>
        <p className="text-[9px]" style={{ color: '#C4B5AC' }}>{dateLabel}</p>
      </div>

      {/* Body */}
      <div className="p-2 flex-1 space-y-1.5">
        {generated ? (
          hasOutfit ? (
            outfits.map((outfit, i) => (
              <div
                key={i}
                className={i > 0 ? 'pt-1.5 mt-1.5 border-t' : ''}
                style={{ borderColor: '#E3D9CE' }}
              >
                {outfits.length > 1 && (
                  <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: '#C4B5AC' }}>
                    {outfit.occasion}
                  </p>
                )}
                <p className="text-[11px] leading-relaxed" style={{ color: '#4A3020' }}>
                  {outfitLine(outfit.items)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-[10px]" style={{ color: '#C4B5AC' }}>rest day</p>
          )
        ) : (
          <>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-0.5 text-[10px] rounded-full px-1.5 py-0.5 border"
                    style={{ borderColor: '#8B1A1A', backgroundColor: '#F0DADA', color: '#6B1010' }}
                  >
                    {tag}
                    <button
                      onClick={() => onRemoveTag(tag)}
                      className="leading-none hover:text-red-700"
                      style={{ color: '#9B6060' }}
                    >×</button>
                  </span>
                ))}
              </div>
            )}
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onFocus={onFocus}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commit() }
                if (e.key === ',') { e.preventDefault(); commit() }
              }}
              onBlur={commit}
              placeholder={tags.length === 0 ? 'add event…' : '+'}
              className="w-full text-[11px] bg-transparent border-b focus:outline-none pb-0.5"
              style={{ borderColor: inputVal ? '#8B1A1A' : '#E3D9CE', color: '#2D1A0E' }}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default function WeekPlanner() {
  const weekDates = getWeekDates()

  const [dayTags, setDayTags]       = useState(Object.fromEntries(DAYS.map(d => [d, []])))
  const [city, setCity]             = useState('')
  const [coords, setCoords]         = useState(null)
  const [locating, setLocating]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [weekData, setWeekData]     = useState([])
  const [weather, setWeather]       = useState(null)
  const [error, setError]           = useState('')
  const [generated, setGenerated]   = useState(false)
  const [focusedDay, setFocusedDay] = useState(null)

  const addTag = (day, tag) => {
    const clean = tag.trim().toLowerCase()
    if (!clean) return
    setDayTags(p => ({ ...p, [day]: p[day].includes(clean) ? p[day] : [...p[day], clean] }))
  }

  const removeTag = (day, tag) => {
    setDayTags(p => ({ ...p, [day]: p[day].filter(t => t !== tag) }))
  }

  const toggleChip = (chip) => {
    if (!focusedDay) return
    dayTags[focusedDay].includes(chip) ? removeTag(focusedDay, chip) : addTag(focusedDay, chip)
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported — type your city.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setCity(''); setLocating(false) },
      ()  => { setLocating(false); setError('Could not get location — type your city instead.') }
    )
  }

  const handleGenerate = async () => {
    const days = DAYS.map((day, i) => ({
      date:     weekDates[i],
      day,
      events:   dayTags[day],
      occasion: dayTags[day].join(' and ') || null,
    }))
    setGenerating(true)
    setError('')
    setFocusedDay(null)
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
    setFocusedDay(null)
    setDayTags(Object.fromEntries(DAYS.map(d => [d, []])))
  }

  const hasLocation  = coords || city.trim()
  const anyOccasion  = DAYS.some(d => dayTags[d].length > 0)
  const getOutfitData = (day) => weekData.find(w => w.day === day) ?? null

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="serif-italic text-3xl leading-snug" style={{ color: '#2D1A0E' }}>week planner</h2>
        <p className="text-sm mt-1" style={{ color: '#9B8E84' }}>
          {weather
            ? `${weatherEmoji(weather.description)} ${weather.city} · ${Math.round(weather.temp_fahrenheit)}°F this week`
            : "tap a day and add your events, then i'll plan each look"
          }
        </p>
      </div>

      {/* Location — compact row, hidden after generation */}
      {!generated && (
        <div className="flex items-center gap-2">
          {coords ? (
            <>
              <span className="text-xs px-2.5 py-1 rounded-full border flex items-center gap-1" style={{ borderColor: '#8B1A1A', backgroundColor: '#F0DADA', color: '#6B1010' }}>
                📍 detected
              </span>
              <button onClick={() => setCoords(null)} className="text-xs" style={{ color: '#C4B5AC' }}>change ×</button>
            </>
          ) : (
            <>
              <button
                onClick={handleGetLocation}
                disabled={locating}
                className="text-xs rounded-full px-3 py-1.5 border shrink-0 flex items-center gap-1.5 disabled:opacity-60"
                style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}
              >
                {locating
                  ? <span className="w-3 h-3 rounded-full border border-[#E3D9CE] border-t-[#8B1A1A] animate-spin inline-block" />
                  : '📍'}
                {locating ? 'locating…' : 'location'}
              </button>
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="or type your city…"
                className="flex-1 text-sm bg-transparent border-b focus:outline-none pb-1"
                style={{ borderColor: city ? '#8B1A1A' : '#E3D9CE', color: '#2D1A0E' }}
              />
            </>
          )}
        </div>
      )}

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map((day, i) => (
          <DayCard
            key={day}
            day={day}
            date={weekDates[i]}
            tags={dayTags[day]}
            onAddTag={tag => addTag(day, tag)}
            onRemoveTag={tag => removeTag(day, tag)}
            outfitData={getOutfitData(day)}
            generated={generated}
            onFocus={() => setFocusedDay(day)}
          />
        ))}
      </div>

      {/* Quick-fill chips — shared, shown when a day is focused */}
      {!generated && focusedDay && (
        <div className="space-y-2 rounded-xl border p-3" style={{ backgroundColor: '#FAF7F2', borderColor: '#E3D9CE' }}>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#C4B5AC' }}>
            adding to {focusedDay.toLowerCase()}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_FILL.map(chip => {
              const active = dayTags[focusedDay]?.includes(chip)
              return (
                <button
                  key={chip}
                  onClick={() => toggleChip(chip)}
                  className="text-[11px] px-2.5 py-1 rounded-full border transition-all"
                  style={{
                    borderColor: active ? '#8B1A1A' : '#E3D9CE',
                    backgroundColor: active ? '#F0DADA' : '#fff',
                    color: active ? '#6B1010' : '#9B8E84',
                  }}
                >
                  {chip}
                </button>
              )
            })}
          </div>
        </div>
      )}

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

      {/* CTA */}
      {!generated ? (
        <button
          onClick={handleGenerate}
          disabled={generating || !hasLocation || !anyOccasion}
          className="flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium disabled:opacity-40"
          style={{ backgroundColor: '#2D1A0E', color: '#FAF7F2' }}
        >
          {generating && <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
          {generating ? 'planning your week…' : 'plan my week →'}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-sm" style={{ color: '#7A9E7A' }}>✓ week planned</p>
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
