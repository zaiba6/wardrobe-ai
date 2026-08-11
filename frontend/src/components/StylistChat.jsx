import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import ClothesLoader from './ClothesLoader'

const API = import.meta.env.VITE_API_URL ?? ''

const STARTERS = [
  {
    label: 'pack for a trip',
    text: "I'm going on a trip and need help packing from my closet.",
  },
  {
    label: 'tonight’s look',
    text: "I'm going out tonight — help me figure out what to wear from my closet.",
  },
  {
    label: 'drinks in the city',
    text: "I'm going out for a drink tonight. Ask me anything you need, then pick from my closet.",
  },
]

function ItemTile({ item }) {
  return (
    <div className="flex flex-col items-center gap-1 w-[4.5rem] shrink-0">
      <div className="w-[4.5rem] h-[4.5rem] rounded-xl overflow-hidden" style={{ backgroundColor: '#F0EAE2' }}>
        <img src={`${API}${item.image_url}`} alt={item.subtype || item.type} className="w-full h-full object-cover" />
      </div>
      <p className="text-[10px] text-center capitalize leading-tight" style={{ color: '#4A3020' }}>
        {item.subtype || item.type}
      </p>
      {item.color && (
        <p className="text-[9px] text-center capitalize leading-tight" style={{ color: '#9B8E84' }}>{item.color}</p>
      )}
    </div>
  )
}

function LookCard({ look }) {
  return (
    <div className="rounded-2xl border p-4 space-y-3 mt-2" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs tracking-widest uppercase" style={{ color: '#8B1A1A' }}>{look.label}</p>
        <p className="text-[10px]" style={{ color: '#C4B5AC' }}>{look.items.length} pieces</p>
      </div>
      {(look.reason || look.notes) && (
        <p className="text-xs leading-relaxed" style={{ color: '#9B8E84' }}>{look.reason || look.notes}</p>
      )}
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {look.items.map(item => (
          <ItemTile key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

function WeatherChip({ weather }) {
  if (!weather) return null
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] border mt-2"
      style={{ borderColor: '#E3D9CE', color: '#4A3020', backgroundColor: '#FAF7F2' }}
    >
      <span style={{ color: '#9B8E84' }}>{weather.city}</span>
      <span>{Math.round(weather.temp_fahrenheit)}°F</span>
      <span className="capitalize" style={{ color: '#9B8E84' }}>{weather.description || weather.condition}</span>
    </div>
  )
}

export default function StylistChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || sending) return

    setError(null)
    setInput('')
    const nextHistory = [...messages, { role: 'user', content }]
    setMessages(nextHistory)
    setSending(true)

    try {
      const payload = {
        messages: nextHistory.map(m => ({ role: m.role, content: m.content })),
      }
      const { data } = await axios.post(`${API}/api/chat`, payload)

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          follow_ups: data.follow_ups || [],
          outfits: data.outfits || [],
          packing_lists: data.packing_lists || [],
          weather: data.weather || null,
          mode: data.mode,
        },
      ])
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'couldn’t reach the stylist — try again')
      setMessages(prev => prev.slice(0, -1))
      setInput(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const reset = () => {
    setMessages([])
    setError(null)
    setInput('')
  }

  const empty = messages.length === 0

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 11rem)' }}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="serif-italic text-2xl leading-none" style={{ color: '#2D1A0E' }}>
            ask the closet
          </h2>
          <p className="text-xs mt-2 tracking-wide" style={{ color: '#9B8E84' }}>
            packing lists, tonight’s outfit — pulled from what you own
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={reset}
            className="text-[10px] rounded-full px-3 py-1.5 border shrink-0 transition-all hover:bg-[#F0EAE2]"
            style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}
          >
            new chat
          </button>
        )}
      </div>

      {empty && (
        <div className="flex-1 flex flex-col justify-center space-y-8 pb-8">
          <p className="serif-italic text-xl max-w-md" style={{ color: '#4A3020' }}>
            tell me where you’re going — i’ll ask the boring questions, then pack or style from your floordrobe.
          </p>
          <div className="flex flex-wrap gap-2">
            {STARTERS.map(s => (
              <button
                key={s.label}
                onClick={() => send(s.text)}
                className="text-xs rounded-full px-4 py-2 border transition-all hover:bg-[#F0DADA] hover:border-[#8B1A1A]"
                style={{ borderColor: '#E3D9CE', color: '#2D1A0E', backgroundColor: '#fff' }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!empty && (
        <div className="flex-1 space-y-5 pb-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[92%] sm:max-w-[80%] ${
                  m.role === 'user' ? 'rounded-2xl rounded-br-md px-4 py-3' : 'space-y-1'
                }`}
                style={
                  m.role === 'user'
                    ? { backgroundColor: '#2D1A0E', color: '#FAF7F2' }
                    : undefined
                }
              >
                {m.role === 'user' ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#2D1A0E' }}>
                      {m.content}
                    </p>
                    <WeatherChip weather={m.weather} />
                    {(m.outfits || []).map((look, j) => (
                      <LookCard key={`o-${j}`} look={look} />
                    ))}
                    {(m.packing_lists || []).map((look, j) => (
                      <LookCard key={`p-${j}`} look={look} />
                    ))}
                    {(m.follow_ups || []).length > 0 && i === messages.length - 1 && !sending && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {m.follow_ups.map(chip => (
                          <button
                            key={chip}
                            onClick={() => send(chip)}
                            className="text-[11px] rounded-full px-3 py-1.5 border transition-all hover:bg-[#F0DADA] hover:border-[#8B1A1A]"
                            style={{ borderColor: '#E3D9CE', color: '#4A3020', backgroundColor: '#fff' }}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-3 py-2">
              <ClothesLoader />
              <p className="text-xs" style={{ color: '#9B8E84' }}>looking through your closet…</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {error && (
        <p className="text-xs mb-2" style={{ color: '#8B1A1A' }}>{error}</p>
      )}

      <form
        onSubmit={e => {
          e.preventDefault()
          send()
        }}
        className="sticky bottom-0 pt-3 pb-1 -mx-1 px-1"
        style={{ background: 'linear-gradient(180deg, rgba(250,247,242,0) 0%, #FAF7F2 28%)' }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl border px-3 py-2"
          style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="e.g. 5 days in toronto, suitcase max 12 pieces…"
            className="flex-1 resize-none bg-transparent text-sm py-2 px-1 outline-none max-h-32"
            style={{ color: '#2D1A0E' }}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-full px-4 py-2 text-xs font-medium shrink-0 transition-all disabled:opacity-40"
            style={{ backgroundColor: '#8B1A1A', color: '#FAF7F2' }}
          >
            send
          </button>
        </div>
      </form>
    </div>
  )
}
