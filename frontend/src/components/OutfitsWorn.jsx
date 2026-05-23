import { useState, useEffect } from 'react'
import axios from 'axios'
import ClothesLoader from './ClothesLoader'

const API = import.meta.env.VITE_API_URL ?? ''

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

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function OutfitsWorn() {
  const [logs, setLogs]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API}/api/outfits/log`)
      .then(res => setLogs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id) => {
    await axios.delete(`${API}/api/outfits/log/${id}`)
    setLogs(p => p.filter(l => l.id !== id))
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="serif text-2xl" style={{ color: '#2D1A0E' }}>outfits worn</h2>
        <p className="text-sm mt-0.5" style={{ color: '#9B8E84' }}>
          {logs.length} {logs.length === 1 ? 'outfit' : 'outfits'} saved
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <ClothesLoader />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-24 space-y-2">
          <p className="serif-italic text-2xl" style={{ color: '#C4B5AC' }}>nothing saved yet</p>
          <p className="text-sm" style={{ color: '#C4B5AC' }}>
            go to today's look and save an outfit you love ✦
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map(log => (
            <div key={log.id} className="rounded-2xl border p-5 space-y-4 group" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
              {/* Meta row */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium" style={{ color: '#2D1A0E' }}>
                    {formatDate(log.worn_at)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {log.occasion && (
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: '#F0DADA', color: '#6B1010' }}>
                        {log.occasion}
                      </span>
                    )}
                    {log.mood && (
                      <span className="text-xs px-2 py-0.5 rounded-full border capitalize" style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}>
                        {log.mood.toLowerCase()}
                      </span>
                    )}
                    {log.weather_city && (
                      <span className="text-xs px-2 py-0.5 rounded-full border flex items-center gap-1" style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}>
                        {weatherEmoji(log.weather_condition)}
                        {log.weather_city}
                        {log.weather_temp_c != null && ` · ${Math.round(log.weather_temp_c)}°C`}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(log.id)}
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#C4B5AC' }}
                  title="Remove from history"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Item photos */}
              <div className="flex gap-3 flex-wrap">
                {log.items.map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 w-16">
                    <div className="w-16 h-16 rounded-xl overflow-hidden" style={{ backgroundColor: '#F0EAE2' }}>
                      <img
                        src={`${API}${item.image_url}`}
                        alt={item.type}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    </div>
                    <p className="text-[10px] text-center capitalize leading-tight" style={{ color: '#9B8E84' }}>
                      {item.subtype || item.type}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
