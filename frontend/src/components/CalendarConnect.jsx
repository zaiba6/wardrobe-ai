import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL ?? ''

const SOURCE_LABEL = { google: 'google calendar', icloud: 'icloud calendar', outlook: 'outlook calendar', calendar: 'calendar' }

const HOW_TO = {
  google: [
    'open Google Calendar on a computer → ⚙️ Settings',
    'under "Settings for my calendars", pick your calendar',
    'scroll to "Integrate calendar" → copy "Secret address in iCal format"',
  ],
  icloud: [
    'open the Calendar app → Calendars',
    'tap ⓘ next to your calendar → turn on Public Calendar',
    'tap Share Link… → Copy',
  ],
  outlook: [
    'outlook.com → ⚙️ Settings → Calendar → Shared calendars',
    'under "Publish a calendar", pick your calendar + "Can view all details"',
    'Publish → copy the ICS link',
  ],
}

/**
 * Connect an iCal (.ics) link so the week planner can fill in real events.
 * Status + actions are owned by the parent (WeekPlanner) so it can re-sync events.
 */
export default function CalendarConnect({ status, syncing, onConnected, onDisconnect, onRefresh }) {
  const [open, setOpen]         = useState(false)
  const [provider, setProvider] = useState('google')
  const [url, setUrl]           = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const connect = async () => {
    if (!url.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await axios.put(`${API}/api/calendar`, { url: url.trim() })
      setUrl('')
      setOpen(false)
      onConnected(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not connect that calendar — try again')
    } finally {
      setSaving(false)
    }
  }

  if (status?.connected) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5" style={{ borderColor: '#C9DCC9', backgroundColor: '#F0F7F0', color: '#4E6E4E' }}>
          📅 {SOURCE_LABEL[status.source] ?? 'calendar'} synced
        </span>
        <button onClick={onRefresh} disabled={syncing} className="text-xs disabled:opacity-50" style={{ color: '#9B8E84' }}>
          {syncing ? 'syncing…' : 'refresh'}
        </button>
        <span style={{ color: '#E3D9CE' }}>·</span>
        <button onClick={onDisconnect} className="text-xs" style={{ color: '#C4B5AC' }}>disconnect</button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>📅</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: '#2D1A0E' }}>import your calendar</p>
          <p className="text-xs" style={{ color: '#9B8E84' }}>i'll fill in your week and dress you for what's actually on it</p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="text-xs rounded-full px-4 py-2 shrink-0"
            style={{ backgroundColor: '#2D1A0E', color: '#FAF7F2' }}
          >
            connect
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {Object.keys(HOW_TO).map(p => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className="text-xs rounded-full px-3 py-1.5 border"
                style={provider === p
                  ? { borderColor: '#8B1A1A', backgroundColor: '#F0DADA', color: '#6B1010' }
                  : { borderColor: '#E3D9CE', color: '#9B8E84' }}
              >
                {{ google: 'Google', icloud: 'iCloud', outlook: 'Outlook' }[p]}
              </button>
            ))}
          </div>

          <ol className="space-y-1 text-xs list-decimal pl-4" style={{ color: '#6B5D52' }}>
            {HOW_TO[provider].map(step => <li key={step}>{step}</li>)}
          </ol>

          <div className="flex gap-2">
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') connect() }}
              placeholder="paste your calendar link…"
              autoCapitalize="none"
              autoCorrect="off"
              className="flex-1 min-w-0 text-sm border rounded-full px-4 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#8B1A1A]"
              style={{ borderColor: '#E3D9CE', color: '#2D1A0E' }}
            />
            <button
              onClick={connect}
              disabled={saving || !url.trim()}
              className="text-sm rounded-full px-4 py-2 shrink-0 disabled:opacity-40 flex items-center gap-1.5"
              style={{ backgroundColor: '#8B1A1A', color: '#fff' }}
            >
              {saving && <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />}
              {saving ? 'checking…' : 'connect'}
            </button>
          </div>

          {error && <p className="text-xs" style={{ color: '#8B1A1A' }}>{error}</p>}

          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px]" style={{ color: '#C4B5AC' }}>
              we only read event names &amp; times to plan outfits. disconnect anytime.
            </p>
            <button onClick={() => { setOpen(false); setError('') }} className="text-xs shrink-0" style={{ color: '#C4B5AC' }}>cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
