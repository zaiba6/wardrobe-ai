import { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL ?? ''

const TYPE_OPTIONS = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'jumpsuit', 'skirt']
const FIT_OPTIONS = ['loose', 'oversized', 'regular', 'fitted', 'bodycon']
const FORMALITY_OPTIONS = ['casual', 'smart-casual', 'formal']
const SEASON_OPTIONS = ['all-season', 'spring-summer', 'fall-winter']

const SUBTYPES = {
  top:       ['tank top', 'crop top', 't-shirt', 'blouse', 'going out top', 'button-down', 'sweater', 'hoodie', 'bodysuit', 'corset top'],
  bottom:    ['jeans', 'trousers', 'shorts', 'leggings', 'sweatpants', 'cargo pants'],
  skirt:     ['mini skirt', 'midi skirt', 'maxi skirt', 'pleated skirt', 'denim skirt', 'slip skirt'],
  dress:     ['mini dress', 'midi dress', 'maxi dress', 'bodycon dress', 'slip dress', 'sundress', 'going out dress', 'wrap dress'],
  outerwear: ['leather jacket', 'denim jacket', 'blazer', 'coat', 'trench coat', 'puffer jacket', 'cardigan', 'bomber jacket'],
  shoes:     ['sneakers', 'ankle boots', 'boots', 'knee-high boots', 'heels', 'sandals', 'loafers', 'flats', 'platform shoes', 'mules'],
  accessory: ['bag', 'belt', 'hat', 'sunglasses', 'jewelry', 'scarf', 'watch'],
  jumpsuit:  ['jumpsuit', 'romper', 'playsuit'],
}

function Spinner() {
  return <div className="w-4 h-4 rounded-full border-2 border-[#E3D9CE] border-t-[#B5756A] animate-spin" />
}

function EditModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    type: item.type || '',
    subtype: item.subtype || '',
    color: item.color || '',
    fit: item.fit || '',
    formality: item.formality || '',
    season: item.season || '',
    description: item.description || '',
    user_notes: item.user_notes || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await axios.put(`${API}/api/clothes/${item.id}`, form)
      onSave(res.data)
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, type = 'text', options = null) => (
    <div>
      <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: '#9B8E84' }}>{label}</label>
      {options ? (
        <select
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#B5756A]"
          style={{ borderColor: '#E3D9CE', color: '#1C1917' }}
        >
          <option value="">—</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#B5756A]"
          style={{ borderColor: '#E3D9CE', color: '#1C1917' }}
        />
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(28,25,23,0.5)' }} onClick={onClose}>
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#FAF7F2' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="h-40 overflow-hidden" style={{ backgroundColor: '#E3D9CE' }}>
          <img src={`${API}${item.image_url}`} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="p-6 space-y-4">
          <h3 className="serif text-lg" style={{ color: '#1C1917' }}>Edit piece</h3>
          <div className="grid grid-cols-2 gap-3">
            {field('Type', 'type', 'text', TYPE_OPTIONS)}
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: '#9B8E84' }}>Subtype</label>
              <select
                value={form.subtype}
                onChange={e => { setForm(p => ({ ...p, subtype: e.target.value })) }}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#B5756A]"
                style={{ borderColor: '#E3D9CE', color: '#1C1917' }}
              >
                <option value="">—</option>
                {(SUBTYPES[form.type] || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {field('Color', 'color')}
            {field('Fit', 'fit', 'text', FIT_OPTIONS)}
            {field('Formality', 'formality', 'text', FORMALITY_OPTIONS)}
            <div className="col-span-2">{field('Season', 'season', 'text', SEASON_OPTIONS)}</div>
            <div className="col-span-2">{field('Description', 'description')}</div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: '#9B8E84' }}>Notes</label>
            <textarea
              value={form.user_notes}
              onChange={e => setForm(p => ({ ...p, user_notes: e.target.value }))}
              rows={2}
              placeholder="anything to remember about this piece..."
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#B5756A] resize-none"
              style={{ borderColor: '#E3D9CE', color: '#1C1917' }}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium transition-all"
              style={{ backgroundColor: '#B5756A', color: '#fff' }}
            >
              {saving && <Spinner />}
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-full py-2.5 text-sm transition-all border"
              style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const FORMALITY_SHORT = { casual: 'casual', 'smart-casual': 'smart', formal: 'formal' }

function PhotoCard({ photo, onEditItem, onDeleteItem }) {
  return (
    <div
      className="rounded-xl overflow-hidden border group"
      style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}
    >
      <div className="aspect-square overflow-hidden" style={{ backgroundColor: '#F0EAE2' }}>
        <img src={`${API}${photo.image_url}`} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="p-2.5 space-y-1.5">
        {photo.items.map(item => (
          <div key={item.id} className="flex items-center gap-1 group/row">
            {/* subtype/type pill */}
            <span
              className="text-xs px-2 py-0.5 rounded-full flex-1 min-w-0 truncate capitalize"
              style={{ backgroundColor: '#EED9D5', color: '#8B4A42' }}
            >
              {item.subtype || item.type}
            </span>
            {/* formality tag — always visible */}
            {item.formality && (
              <span className="text-[10px] shrink-0 capitalize" style={{ color: '#C4B5AC' }}>
                {FORMALITY_SHORT[item.formality] ?? item.formality}
              </span>
            )}
            {/* edit — always visible */}
            <button
              onClick={() => onEditItem(item)}
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors hover:text-[#B5756A]"
              style={{ color: '#C4B5AC' }}
              title="Edit tags"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.5-6.5a2 2 0 012.828 2.828L11.828 13.828A4 4 0 019 15H7v-2a4 4 0 012-3.468z" />
              </svg>
            </button>
            {/* delete — appears on row hover */}
            <button
              onClick={() => onDeleteItem(item.id)}
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:text-[#C47A70]"
              style={{ color: '#C4B5AC' }}
              title="Remove"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Wardrobe() {
  const [clothes, setClothes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filters, setFilters] = useState({ type: '', subtype: '', fit: '', formality: '', season: '' })
  const [editingItem, setEditingItem] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // Group items by photo — one card per image, multiple pills per card
  const photos = useMemo(() => {
    const map = {}
    clothes.forEach(item => {
      const key = item.image_url
      if (!map[key]) map[key] = { image_url: item.image_url, items: [] }
      map[key].items.push(item)
    })
    return Object.values(map)
  }, [clothes])

  const fetchClothes = async (f = filters) => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v))
      const res = await axios.get(`${API}/api/clothes`, { params })
      setClothes(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClothes() }, [])

  const [uploadStatus, setUploadStatus] = useState('')
  const [detected, setDetected] = useState(null)       // currently shown confirmation sheet
  const [detectedQueue, setDetectedQueue] = useState([]) // remaining multi-item photos waiting

  // Returns existing item if a close match is found (same type+subtype, overlapping color word)
  const findDuplicate = (detectedItem) => {
    const colorWord = detectedItem.color?.toLowerCase().split(/\s+/)[0]
    return clothes.find(c =>
      c.type === detectedItem.type &&
      c.subtype === detectedItem.subtype &&
      colorWord && c.color?.toLowerCase().includes(colorWord)
    ) ?? null
  }

  const _advanceQueue = (queue) => {
    if (queue.length > 0) {
      setDetectedQueue(queue.slice(1))
      setDetected({ ...queue[0], queueTotal: queue.length + 1 })
    } else {
      setDetectedQueue([])
      setDetected(null)
    }
  }

  const handleUpload = async (files) => {
    const list = files instanceof FileList ? Array.from(files) : [files]
    if (!list.length) return
    setUploading(true)
    const multiQueue = []
    for (let i = 0; i < list.length; i++) {
      setUploadStatus(list.length > 1 ? `analyzing ${i + 1} of ${list.length}…` : 'reading your photo…')
      try {
        const fd = new FormData()
        fd.append('image', list[i])
        const res = await axios.post(`${API}/api/clothes/detect`, fd)
        const { filename, image_url, items } = res.data
        // Tag each item with a duplicate match (if any)
        const itemsTagged = items.map(it => ({ ...it, _dup: findDuplicate(it) }))
        const hasDup = itemsTagged.some(it => it._dup)

        if (items.length === 1 && !hasDup) {
          // single unique item — save immediately, keep looping
          const save = await axios.post(`${API}/api/clothes/save-detected`, { filename, items })
          setClothes(p => [...save.data, ...p])
        } else {
          // multi-item OR has a duplicate — queue for confirmation
          multiQueue.push({ filename, image_url, items: itemsTagged, selected: items.map((_, idx) => idx) })
        }
      } catch {
        // skip failed photo, continue
      }
    }
    setUploading(false)
    setUploadStatus('')
    // Show queued multi-item photos one by one
    if (multiQueue.length > 0) {
      setDetectedQueue(multiQueue.slice(1))
      setDetected({ ...multiQueue[0], queueTotal: multiQueue.length })
    }
  }

  const handleConfirmDetected = async () => {
    if (!detected) return
    // Strip internal _dup marker before sending to API
    const chosen = detected.items
      .filter((_, idx) => detected.selected.includes(idx))
      .map(({ _dup, ...rest }) => rest)
    try {
      const res = await axios.post(`${API}/api/clothes/save-detected`, {
        filename: detected.filename,
        items: chosen,
      })
      setClothes(p => [...res.data, ...p])
    } finally {
      _advanceQueue(detectedQueue)
    }
  }

  const handleDelete = async (id) => {
    await axios.delete(`${API}/api/clothes/${id}`)
    setClothes(p => p.filter(c => c.id !== id))
  }

  const handleFilterChange = (field, value) => {
    const f = { ...filters, [field]: value }
    setFilters(f)
    fetchClothes(f)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="serif text-2xl" style={{ color: '#1C1917' }}>the floordrobe</h2>
          <p className="text-sm mt-0.5" style={{ color: '#9B8E84' }}>
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'} · {clothes.length} {clothes.length === 1 ? 'piece' : 'pieces'}
          </p>
        </div>
        <button
          onClick={() => !uploading && fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all disabled:opacity-60"
          style={{ backgroundColor: '#1C1917', color: '#FAF7F2' }}
        >
          {uploading ? <Spinner /> : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
          {uploading ? 'analyzing…' : 'add piece'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { handleUpload(e.target.files); e.target.value = '' }} />
      </div>

      {/* Upload drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${dragOver ? 'border-[#B5756A] bg-[#EED9D5]/30' : 'border-[#E3D9CE] hover:border-[#B5756A]/40'}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#E3D9CE] border-t-[#B5756A] animate-spin" />
            <p className="text-sm" style={{ color: '#B5756A' }}>{uploadStatus}</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="serif-italic text-xl" style={{ color: '#9B8E84' }}>drop a photo here</p>
            <p className="text-xs tracking-wide" style={{ color: '#C4B5AC' }}>or tap to choose from camera roll</p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filters.type}
          onChange={e => {
            const f = { ...filters, type: e.target.value, subtype: '' }
            setFilters(f); fetchClothes(f)
          }}
          className="text-xs border rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#B5756A] cursor-pointer"
          style={{ borderColor: '#E3D9CE', backgroundColor: '#fff', color: '#6B5E57' }}
        >
          <option value="">all types</option>
          {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        {filters.type && SUBTYPES[filters.type] && (
          <select
            value={filters.subtype}
            onChange={e => handleFilterChange('subtype', e.target.value)}
            className="text-xs border rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#B5756A] cursor-pointer"
            style={{ borderColor: '#B5756A', backgroundColor: '#EED9D5', color: '#8B4A42' }}
          >
            <option value="">all {filters.type}s</option>
            {SUBTYPES[filters.type].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}

        {[
          { field: 'fit', options: FIT_OPTIONS, label: 'fit' },
          { field: 'formality', options: FORMALITY_OPTIONS, label: 'formality' },
          { field: 'season', options: SEASON_OPTIONS, label: 'season' },
        ].map(({ field, options, label }) => (
          <select
            key={field}
            value={filters[field]}
            onChange={e => handleFilterChange(field, e.target.value)}
            className="text-xs border rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#B5756A] cursor-pointer"
            style={{ borderColor: '#E3D9CE', backgroundColor: '#fff', color: '#6B5E57' }}
          >
            <option value="">all {label}s</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}

        {Object.values(filters).some(Boolean) && (
          <button
            onClick={() => { const f = { type: '', subtype: '', fit: '', formality: '', season: '' }; setFilters(f); fetchClothes(f) }}
            className="text-xs rounded-full px-3 py-1.5 transition-all"
            style={{ color: '#B5756A' }}
          >
            clear ×
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-[#E3D9CE] border-t-[#B5756A] animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-24 space-y-2">
          <p className="serif-italic text-2xl" style={{ color: '#C4B5AC' }}>nothing here yet</p>
          <p className="text-sm" style={{ color: '#C4B5AC' }}>upload your first piece above</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map(photo => (
            <PhotoCard
              key={photo.image_url}
              photo={photo}
              onEditItem={setEditingItem}
              onDeleteItem={handleDelete}
            />
          ))}
        </div>
      )}

      {editingItem && (
        <EditModal
          item={editingItem}
          onSave={updated => {
            setClothes(p => p.map(c => c.id === updated.id ? updated : c))
            setEditingItem(null)
          }}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Multi-item detection sheet */}
      {detected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(28,25,23,0.5)' }} onClick={() => _advanceQueue(detectedQueue)}>
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[85vh] overflow-y-auto"
            style={{ backgroundColor: '#FAF7F2' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="h-44 overflow-hidden rounded-t-3xl sm:rounded-t-2xl relative" style={{ backgroundColor: '#E3D9CE' }}>
              <img src={`${API}${detected.image_url}`} alt="" className="w-full h-full object-cover object-top" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(28,25,23,0.4), transparent)' }} />
              <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between">
                <p className="text-white text-sm font-medium">
                  we spotted {detected.items.length} pieces —
                </p>
                {detected.queueTotal > 1 && (
                  <p className="text-white/70 text-xs">
                    photo {detected.queueTotal - detectedQueue.length} of {detected.queueTotal}
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm" style={{ color: '#9B8E84' }}>select the ones you want to add to your closet</p>

              <div className="space-y-2">
                {detected.items.map((item, idx) => {
                  const checked = detected.selected.includes(idx)
                  return (
                    <button
                      key={idx}
                      onClick={() => setDetected(d => ({
                        ...d,
                        selected: checked
                          ? d.selected.filter(i => i !== idx)
                          : [...d.selected, idx],
                      }))}
                      className="w-full flex items-start gap-3 rounded-xl p-3 border text-left transition-all"
                      style={{
                        backgroundColor: checked ? '#EED9D5' : '#fff',
                        borderColor: checked ? '#B5756A' : '#E3D9CE',
                      }}
                    >
                      <div className="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all"
                        style={{ backgroundColor: checked ? '#B5756A' : '#fff', borderColor: checked ? '#B5756A' : '#E3D9CE' }}>
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium capitalize" style={{ color: '#1C1917' }}>{item.description || item.type}</p>
                          {item._dup && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                              already in closet
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {[item.type, item.color, item.fit].filter(Boolean).map((tag, t) => (
                            <span key={t} className="text-xs px-2 py-0.5 rounded-full border capitalize" style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleConfirmDetected}
                  disabled={detected.selected.length === 0}
                  className="flex-1 rounded-full py-2.5 text-sm font-medium transition-all disabled:opacity-40"
                  style={{ backgroundColor: '#1C1917', color: '#FAF7F2' }}
                >
                  add {detected.selected.length} {detected.selected.length === 1 ? 'piece' : 'pieces'}
                  {detectedQueue.length > 0 && ' →'}
                </button>
                <button
                  onClick={() => _advanceQueue(detectedQueue)}
                  className="flex-1 rounded-full py-2.5 text-sm border transition-all"
                  style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}
                >
                  {detectedQueue.length > 0 ? 'skip →' : 'cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
