import { useEffect, useState } from 'react'
import axios from 'axios'
import ClothesLoader from './ClothesLoader'
import CalendarConnect from './CalendarConnect'

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

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDates() {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  return DAYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return ymd(d)
  })
}

// Calendar event → the tag we plan an outfit around, e.g. "dinner w/ sam (7pm)"
function eventTag(ev) {
  const title = ev.title.trim().toLowerCase()
  return ev.time ? `${title} (${ev.time})` : title
}

function outfitLine(items) {
  return items.map(item => item.subtype || item.type).join(' + ')
}

// Modal shown when user clicks a generated day
function DayModal({ dayData, date, onClose }) {
  if (!dayData) return null
  const outfits = dayData.outfits ?? []
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(45,26,14,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 space-y-5 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: '#FAF7F2' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-semibold" style={{ color: '#2D1A0E' }}>{dateLabel}</p>
            {dayData.events?.length > 0 && (
              <p className="text-xs mt-0.5" style={{ color: '#9B8E84' }}>{dayData.events.join(' · ')}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-lg leading-none mt-0.5"
            style={{ color: '#C4B5AC' }}
          >×</button>
        </div>

        {/* Outfit(s) */}
        {outfits.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: '#C4B5AC' }}>rest day</p>
        ) : (
          outfits.map((outfit, i) => (
            <div key={i} className={i > 0 ? 'pt-4 border-t' : ''} style={{ borderColor: '#E3D9CE' }}>
              {outfits.length > 1 && (
                <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: '#C4B5AC' }}>
                  {outfit.occasion}
                </p>
              )}
              {/* Item image grid */}
              <div className="flex gap-3 flex-wrap">
                {outfit.items.map((item, j) => (
                  <div key={item.id ?? j} className="flex flex-col items-center gap-1.5 w-[72px]">
                    <div className="w-[72px] h-[72px] rounded-xl overflow-hidden" style={{ backgroundColor: '#F0EAE2' }}>
                      <img
                        src={`${API}${item.image_url}`}
                        alt={item.type}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[10px] text-center capitalize leading-tight" style={{ color: '#4A3020' }}>
                      {item.subtype || item.type}
                    </p>
                    <p className="text-[9px] text-center capitalize" style={{ color: '#C4B5AC' }}>{item.color}</p>
                  </div>
                ))}
              </div>
              {outfit.reason && (
                <p className="text-xs italic mt-3" style={{ color: '#9B8E84' }}>{outfit.reason}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function DayCard({ day, date, tags, calendarTags, onAddTag, onRemoveTag, outfitData, generated, onFocus, combined, onToggleCombined, onClickGenerated }) {
  const [inputVal, setInputVal] = useState('')
  const outfits  = outfitData?.outfits ?? []
  const hasOutfit = outfits.length > 0
  const isToday  = date === ymd(new Date())
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
      className={`rounded-2xl sm:rounded-xl border flex flex-row sm:flex-col overflow-hidden ${generated && hasOutfit ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
      style={{
        backgroundColor: '#fff',
        borderColor: isToday ? '#C4A8A8' : hasOutfit ? '#D4C5C5' : '#E3D9CE',
      }}
      onClick={generated && hasOutfit ? onClickGenerated : undefined}
    >
      {/* Day header — a date column on phones, a strip on top in the grid */}
      <div
        className="w-16 sm:w-auto shrink-0 flex flex-col items-center justify-center sm:items-start px-2 py-3 sm:pt-2 sm:pb-1 border-r sm:border-r-0 sm:border-b"
        style={{
          borderColor: isToday ? '#C4A8A8' : '#E3D9CE',
          backgroundColor: isToday ? '#F5E8E8' : 'transparent',
        }}
      >
        <p className="text-xs sm:text-[11px] font-semibold uppercase sm:normal-case tracking-wider sm:tracking-normal" style={{ color: isToday ? '#8B1A1A' : '#2D1A0E' }}>{DAY_SHORT[day]}</p>
        <p className="serif text-2xl sm:hidden leading-tight" style={{ color: '#2D1A0E' }}>{dateObj.getDate()}</p>
        <p className="hidden sm:block text-[9px]" style={{ color: '#C4B5AC' }}>{dateLabel}</p>
      </div>

      {/* Body */}
      <div className="p-3 sm:p-2 flex-1 min-w-0 space-y-2 sm:space-y-1.5 sm:min-h-[90px]">
        {generated ? (
          hasOutfit ? (
            <>
              {outfits.map((outfit, i) => (
                <div
                  key={i}
                  className={i > 0 ? 'pt-2 mt-2 sm:pt-1.5 sm:mt-1.5 border-t' : ''}
                  style={{ borderColor: '#E3D9CE' }}
                >
                  {outfits.length > 1 && (
                    <p className="text-[10px] sm:text-[9px] uppercase tracking-wider mb-1 sm:mb-0.5" style={{ color: '#C4B5AC' }}>
                      {outfit.occasion}
                    </p>
                  )}
                  {/* Thumbnails on phones */}
                  <div className="flex gap-1.5 mb-1.5 sm:hidden">
                    {outfit.items.slice(0, 5).map((item, j) => (
                      <div key={item.id ?? j} className="w-11 h-11 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: '#F0EAE2' }}>
                        <img src={`${API}${item.image_url}`} alt={item.type} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm sm:text-[11px] leading-snug sm:leading-relaxed capitalize sm:normal-case" style={{ color: '#4A3020' }}>
                    {outfitLine(outfit.items)}
                  </p>
                </div>
              ))}
              <p className="text-[11px] sm:text-[9px]" style={{ color: '#C4B5AC' }}>tap to see →</p>
            </>
          ) : (
            <p className="text-sm sm:text-[10px] py-1" style={{ color: '#C4B5AC' }}>rest day</p>
          )
        ) : (
          <>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-1">
                {tags.map(tag => {
                  const fromCal = calendarTags.includes(tag)
                  return (
                    <span
                      key={tag}
                      className="flex items-center gap-1 sm:gap-0.5 text-xs sm:text-[10px] rounded-full px-2.5 sm:px-1.5 py-1 sm:py-0.5 border max-w-full"
                      style={fromCal
                        ? { borderColor: '#E3D9CE', backgroundColor: '#F0EAE2', color: '#4A3020' }
                        : { borderColor: '#8B1A1A', backgroundColor: '#F0DADA', color: '#6B1010' }}
                      title={fromCal ? 'from your calendar' : undefined}
                    >
                      {fromCal && <span aria-hidden>📅</span>}
                      <span className="truncate">{tag}</span>
                      <button
                        onClick={e => { e.stopPropagation(); onRemoveTag(tag) }}
                        className="leading-none text-sm sm:text-xs shrink-0"
                        style={{ color: '#9B6060' }}
                        aria-label={`remove ${tag}`}
                      >×</button>
                    </span>
                  )
                })}
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
              placeholder={tags.length === 0 ? 'add event…' : '+ add another'}
              className="w-full text-sm sm:text-[11px] bg-transparent border-b focus:outline-none pb-1 sm:pb-0.5"
              style={{ borderColor: inputVal ? '#8B1A1A' : '#E3D9CE', color: '#2D1A0E' }}
            />
            {/* Combined toggle — only shown when 2+ events */}
            {tags.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); onToggleCombined() }}
                className="text-[11px] sm:text-[9px] rounded-full px-2.5 sm:px-1.5 py-1 sm:py-0.5 border transition-all"
                style={{
                  borderColor: combined ? '#8B1A1A' : '#E3D9CE',
                  backgroundColor: combined ? '#F0DADA' : 'transparent',
                  color: combined ? '#6B1010' : '#C4B5AC',
                }}
              >
                {combined ? 'one outfit' : 'separate →'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function WeekPlanner() {
  const weekDates = getWeekDates()

  const [dayTags, setDayTags]       = useState(Object.fromEntries(DAYS.map(d => [d, []])))
  const [dayMode, setDayMode]       = useState(Object.fromEntries(DAYS.map(d => [d, false]))) // false = separate
  const [city, setCity]             = useState('')
  const [coords, setCoords]         = useState(null)
  const [locating, setLocating]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [weekData, setWeekData]     = useState([])
  const [weather, setWeather]       = useState(null)
  const [error, setError]           = useState('')
  const [generated, setGenerated]   = useState(false)
  const [focusedDay, setFocusedDay] = useState(null)
  const [modalDay, setModalDay]     = useState(null)   // day name for detail modal
  const [calStatus, setCalStatus]   = useState(null)   // { connected, source }
  const [calendarTags, setCalendarTags] = useState({}) // day → tags imported from the calendar
  const [syncing, setSyncing]       = useState(false)

  // Pull this week's events and swap them in for previously imported ones (manual tags stay)
  const syncCalendar = async () => {
    setSyncing(true)
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await axios.get(`${API}/api/calendar/events`, { params: { start: weekDates[0], days: 7, tz } })
      const next = Object.fromEntries(DAYS.map((day, i) => [day, (res.data.days[weekDates[i]] ?? []).map(eventTag)]))
      setDayTags(prev => Object.fromEntries(DAYS.map(day => {
        const manual = prev[day].filter(t => !(calendarTags[day] ?? []).includes(t))
        return [day, [...next[day], ...manual.filter(t => !next[day].includes(t))]]
      })))
      setCalendarTags(next)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not sync your calendar')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    axios.get(`${API}/api/calendar`)
      .then(res => setCalStatus(res.data))
      .catch(() => setCalStatus({ connected: false }))
  }, [])

  useEffect(() => {
    if (calStatus?.connected) syncCalendar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calStatus?.connected])

  const disconnectCalendar = async () => {
    await axios.delete(`${API}/api/calendar`).catch(() => {})
    setDayTags(prev => Object.fromEntries(DAYS.map(day => [day, prev[day].filter(t => !(calendarTags[day] ?? []).includes(t))])))
    setCalendarTags({})
    setCalStatus({ connected: false })
  }

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

  const toggleCombined = (day) => {
    setDayMode(p => ({ ...p, [day]: !p[day] }))
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
      combined: dayMode[day],
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
    setModalDay(null)
    setDayTags(Object.fromEntries(DAYS.map(d => [d, calendarTags[d] ?? []])))
    setDayMode(Object.fromEntries(DAYS.map(d => [d, false])))
  }

  const hasLocation  = coords || city.trim()
  const anyOccasion  = DAYS.some(d => dayTags[d].length > 0)
  const getOutfitData = (day) => weekData.find(w => w.day === day) ?? null

  const modalData = modalDay ? {
    data: getOutfitData(modalDay),
    date: weekDates[DAYS.indexOf(modalDay)],
  } : null

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="serif-italic text-3xl leading-snug" style={{ color: '#2D1A0E' }}>week planner</h2>
        <p className="text-sm mt-1" style={{ color: '#9B8E84' }}>
          {weather
            ? `${weatherEmoji(weather.description)} ${weather.city} · ${Math.round(weather.temp_fahrenheit)}°F this week`
            : calStatus?.connected
              ? "your events are in — tweak anything, then plan your week"
              : "tap a day, add your events — i'll plan each look"
          }
        </p>
      </div>

      {/* Calendar import — hidden after generation */}
      {!generated && calStatus && (
        <CalendarConnect
          status={calStatus}
          syncing={syncing}
          onConnected={setCalStatus}
          onDisconnect={disconnectCalendar}
          onRefresh={syncCalendar}
        />
      )}

      {/* Location — compact, hidden after generation */}
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

      {/* Calendar — stacked rows on phones, 7 columns on wider screens */}
      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-7 sm:gap-1.5">
        {DAYS.map((day, i) => (
          <DayCard
            key={day}
            day={day}
            date={weekDates[i]}
            tags={dayTags[day]}
            calendarTags={calendarTags[day] ?? []}
            onAddTag={tag => addTag(day, tag)}
            onRemoveTag={tag => removeTag(day, tag)}
            outfitData={getOutfitData(day)}
            generated={generated}
            onFocus={() => setFocusedDay(day)}
            combined={dayMode[day]}
            onToggleCombined={() => toggleCombined(day)}
            onClickGenerated={() => setModalDay(day)}
          />
        ))}
      </div>

      {/* Shared quick-fill chips (shown when a day is focused) */}
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
          {dayTags[focusedDay]?.length > 1 && (
            <p className="text-[10px]" style={{ color: '#C4B5AC' }}>
              {dayMode[focusedDay]
                ? 'one outfit planned for all events'
                : 'separate outfit per event — tap "separate →" on the day to combine'
              }
            </p>
          )}
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
          <p className="text-sm" style={{ color: '#7A9E7A' }}>✓ week planned — tap any day to see your look</p>
          <button
            onClick={handleReset}
            className="text-xs rounded-full px-3 py-1.5 border"
            style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}
          >
            start over
          </button>
        </div>
      )}

      {/* Day detail modal */}
      {modalDay && modalData && (
        <DayModal
          dayData={modalData.data}
          date={modalData.date}
          onClose={() => setModalDay(null)}
        />
      )}
    </div>
  )
}
