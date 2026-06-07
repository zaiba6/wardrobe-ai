import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL ?? ''

const STYLE_VIBES = [
  'minimalist', 'maximalist', 'quiet luxury', 'old money', 'streetwear',
  'Y2K', 'dark academia', 'coastal', 'bohemian', 'preppy', 'romantic',
  'edgy', 'sporty chic', 'clean girl', 'cottagecore', 'business casual',
  'avant-garde', 'eclectic',
]

const OUTFIT_RULES = [
  {
    key: 'rule_of_three',
    label: 'Rule of Three',
    description: 'Max 3 colors per outfit. Neutrals are always free. Accessories should unify the palette.',
  },
  {
    key: 'strapless_layer',
    label: 'Strapless needs a layer',
    description: 'Strapless or thin-strap tops need a blazer or cardigan for smart-casual+ settings.',
  },
  {
    key: 'one_top',
    label: 'One top only',
    description: "No wearing two tops at once — layers must be outerwear (blazer, jacket, cardigan).",
  },
  {
    key: 'formality_match',
    label: 'Occasion-formality matching',
    description: 'Match the outfit vibe to the occasion. No sporty pieces for a night out.',
  },
  {
    key: 'no_activewear_mix',
    label: 'No mixing gym & regular clothes',
    description: 'Never combine activewear (leggings, sports bra) with regular fashion pieces.',
  },
  {
    key: 'work_rules',
    label: 'Work dress code',
    description: 'No crop tops, bodycon, or going-out pieces for office occasions.',
  },
  {
    key: 'gym_rules',
    label: 'Gym = activewear only',
    description: 'For gym days, only select activewear items.',
  },
]

const PRESET_BOARDS = [
  {
    label: 'Work',
    rules: 'Formal or smart-casual only. No crop tops, no mini skirts unless with tights, no bodycon, no sheer tops. Blazers and structured cardigans are always appropriate. Trousers, midi skirts, and tailored pieces preferred.',
  },
  {
    label: 'Gym',
    rules: 'Activewear only. Sports bra, leggings, gym shorts, athletic top, track pants. No regular clothing or fashion outerwear. Sneakers required.',
  },
  {
    label: 'Date Night',
    rules: 'Elegant but not overdressed. Slip dresses, midi skirts, fitted tops, heels or ankle boots. Balance showing skin — revealing top = modest bottom and vice versa.',
  },
  {
    label: 'Wedding Guest',
    rules: 'No white, ivory, or cream. Midi or maxi dress preferred. Smart-casual to formal. No jeans, sneakers, or hoodies.',
  },
  {
    label: 'Brunch',
    rules: 'Elevated casual. Nice jeans, midi skirts, blouses, dresses. Not gym wear, not too formal. Sandals or loafers.',
  },
  {
    label: 'Travel',
    rules: 'Comfortable but put-together. Layers work well. Practical footwear. Avoid anything too restrictive or delicate.',
  },
]

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={onChange}
      className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none"
      style={{ backgroundColor: on ? '#8B1A1A' : '#D4C5C5' }}
      aria-checked={on}
      role="switch"
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 mt-0.5"
        style={{ transform: on ? 'translateX(17px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

export default function Settings() {
  const [styleVibes, setStyleVibes]       = useState([])
  const [disabledRules, setDisabledRules] = useState([])
  const [boards, setBoards]               = useState([])
  const [saving, setSaving]               = useState(false)
  const [saveMsg, setSaveMsg]             = useState('')
  const [creatingPreset, setCreatingPreset] = useState(null) // preset label being created

  useEffect(() => {
    axios.get(`${API}/api/settings`)
      .then(r => { setStyleVibes(r.data.style_vibes || []); setDisabledRules(r.data.disabled_rules || []) })
      .catch(() => {})
    axios.get(`${API}/api/style-boards`)
      .then(r => setBoards(r.data))
      .catch(() => {})
  }, [])

  const save = async (newVibes, newDisabled) => {
    setSaving(true)
    try {
      await axios.patch(`${API}/api/settings`, {
        style_vibes: newVibes,
        disabled_rules: newDisabled,
      })
      setSaveMsg('saved')
      setTimeout(() => setSaveMsg(''), 1500)
    } catch { /* silent */ } finally { setSaving(false) }
  }

  const toggleVibe = (vibe) => {
    const next = styleVibes.includes(vibe)
      ? styleVibes.filter(v => v !== vibe)
      : [...styleVibes, vibe]
    setStyleVibes(next)
    save(next, disabledRules)
  }

  const toggleRule = (key) => {
    const next = disabledRules.includes(key)
      ? disabledRules.filter(k => k !== key)
      : [...disabledRules, key]
    setDisabledRules(next)
    save(styleVibes, next)
  }

  const createPresetBoard = async (preset) => {
    setCreatingPreset(preset.label)
    try {
      const res = await axios.post(`${API}/api/style-boards`, { label: preset.label, rules: preset.rules })
      setBoards(p => [...p, res.data])
    } catch { /* silent */ } finally { setCreatingPreset(null) }
  }

  const boardExists = (label) => boards.some(b => b.label.toLowerCase() === label.toLowerCase())

  return (
    <div className="space-y-12 max-w-2xl">
      <div>
        <h2 className="serif-italic text-3xl leading-snug" style={{ color: '#2D1A0E' }}>settings</h2>
        <p className="text-sm mt-1" style={{ color: '#9B8E84' }}>personalise your style ai</p>
      </div>

      {/* ── Your Aesthetic ── */}
      <section className="space-y-4">
        <div>
          <h3 className="serif text-xl" style={{ color: '#2D1A0E' }}>your aesthetic</h3>
          <p className="text-sm mt-0.5" style={{ color: '#9B8E84' }}>
            select all that resonate — the ai keeps your vibe in mind for every recommendation
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STYLE_VIBES.map(vibe => {
            const active = styleVibes.includes(vibe)
            return (
              <button
                key={vibe}
                onClick={() => toggleVibe(vibe)}
                className="text-sm rounded-full px-3.5 py-1.5 border transition-all"
                style={{
                  borderColor: active ? '#8B1A1A' : '#E3D9CE',
                  backgroundColor: active ? '#F0DADA' : '#fff',
                  color: active ? '#6B1010' : '#9B8E84',
                }}
              >
                {vibe}
              </button>
            )
          })}
        </div>
        {styleVibes.length > 0 && (
          <p className="text-xs" style={{ color: '#C4B5AC' }}>
            {styleVibes.length} selected · {saveMsg ? '✓ saved' : saving ? 'saving…' : ''}
          </p>
        )}
      </section>

      {/* ── Outfit Rules ── */}
      <section className="space-y-4">
        <div>
          <h3 className="serif text-xl" style={{ color: '#2D1A0E' }}>outfit rules</h3>
          <p className="text-sm mt-0.5" style={{ color: '#9B8E84' }}>
            toggle rules on or off — changes apply to all future outfit suggestions
          </p>
        </div>
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#E3D9CE' }}>
          {OUTFIT_RULES.map((rule, i) => {
            const enabled = !disabledRules.includes(rule.key)
            return (
              <div
                key={rule.key}
                className="flex items-center justify-between gap-4 px-5 py-4"
                style={{
                  borderTop: i > 0 ? '1px solid #E3D9CE' : 'none',
                  backgroundColor: enabled ? '#fff' : '#FAF7F2',
                }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: enabled ? '#2D1A0E' : '#9B8E84' }}>
                    {rule.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#C4B5AC' }}>{rule.description}</p>
                </div>
                <Toggle on={enabled} onChange={() => toggleRule(rule.key)} />
              </div>
            )
          })}
        </div>
        {saveMsg && <p className="text-xs" style={{ color: '#7A9E7A' }}>✓ rules saved</p>}
      </section>

      {/* ── Preset Event Vibes ── */}
      <section className="space-y-4">
        <div>
          <h3 className="serif text-xl" style={{ color: '#2D1A0E' }}>preset event vibes</h3>
          <p className="text-sm mt-0.5" style={{ color: '#9B8E84' }}>
            quick-add vibes for common occasions with pre-filled rules — the ai follows them when you plan that day
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRESET_BOARDS.map(preset => {
            const exists = boardExists(preset.label)
            const creating = creatingPreset === preset.label
            return (
              <div
                key={preset.label}
                className="rounded-2xl border p-4 space-y-2"
                style={{ backgroundColor: '#fff', borderColor: exists ? '#D4C5C5' : '#E3D9CE' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium" style={{ color: '#2D1A0E' }}>{preset.label}</p>
                  {exists ? (
                    <span className="text-[10px] rounded-full px-2.5 py-0.5" style={{ backgroundColor: '#F0F7F0', color: '#7A9E7A' }}>
                      ✓ added
                    </span>
                  ) : (
                    <button
                      onClick={() => createPresetBoard(preset)}
                      disabled={creating}
                      className="text-xs rounded-full px-3 py-1 border transition-all disabled:opacity-50"
                      style={{ borderColor: '#8B1A1A', color: '#8B1A1A' }}
                    >
                      {creating ? '…' : '+ add'}
                    </button>
                  )}
                </div>
                <p className="text-xs line-clamp-2" style={{ color: '#9B8E84' }}>{preset.rules}</p>
              </div>
            )
          })}
        </div>
        {boards.length > 0 && (
          <p className="text-xs" style={{ color: '#C4B5AC' }}>
            rules auto-apply when you plan that event in the week planner
          </p>
        )}
      </section>
    </div>
  )
}
