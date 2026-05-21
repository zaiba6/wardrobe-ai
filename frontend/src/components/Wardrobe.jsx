import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL ?? ''

const TYPE_OPTIONS = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'jumpsuit', 'skirt']
const FIT_OPTIONS = ['loose', 'oversized', 'regular', 'fitted', 'bodycon']
const FORMALITY_OPTIONS = ['casual', 'smart-casual', 'formal']
const SEASON_OPTIONS = ['all-season', 'spring-summer', 'fall-winter']

function Spinner() {
  return <div className="w-4 h-4 rounded-full border-2 border-[#E3D9CE] border-t-[#B5756A] animate-spin" />
}

function EditModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    type: item.type || '',
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

function ClothingCard({ item, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="group relative rounded-xl overflow-hidden border transition-all duration-200"
      style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: '#F0EAE2' }}>
        <img src={`${API}${item.image_url}`} alt={item.type} className="w-full h-full object-cover" />
        {hovered && (
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={() => onEdit(item)}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
              style={{ backgroundColor: 'rgba(250,247,242,0.92)', color: '#9B8E84' }}
              title="Edit"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.5-6.5a2 2 0 012.828 2.828L11.828 13.828A4 4 0 019 15H7v-2a4 4 0 012-3.468z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
              style={{ backgroundColor: 'rgba(250,247,242,0.92)', color: '#9B8E84' }}
              title="Delete"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <div className="p-2.5 space-y-1">
        <div className="flex flex-wrap gap-1">
          {item.type && (
            <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: '#EED9D5', color: '#8B4A42' }}>
              {item.type}
            </span>
          )}
          {item.fit && (
            <span className="text-xs px-2 py-0.5 rounded-full capitalize border" style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}>
              {item.fit}
            </span>
          )}
        </div>
        {item.color && <p className="text-xs capitalize" style={{ color: '#9B8E84' }}>{item.color}</p>}
        {item.description && <p className="text-xs truncate" style={{ color: '#6B5E57' }}>{item.description}</p>}
      </div>
    </div>
  )
}

export default function Wardrobe() {
  const [clothes, setClothes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filters, setFilters] = useState({ type: '', fit: '', formality: '', season: '' })
  const [editingItem, setEditingItem] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

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

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('user_notes', '')
      const res = await axios.post(`${API}/api/clothes/upload`, fd)
      setClothes(p => [res.data, ...p])
    } catch {
      // silent — Claude failure shouldn't block the UI
    } finally {
      setUploading(false)
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
          <h2 className="serif text-2xl" style={{ color: '#1C1917' }}>the closet</h2>
          <p className="text-sm mt-0.5" style={{ color: '#9B8E84' }}>
            {clothes.length} {clothes.length === 1 ? 'piece' : 'pieces'} archived
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
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { handleUpload(e.target.files?.[0]); e.target.value = '' }} />
      </div>

      {/* Upload drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${dragOver ? 'border-[#B5756A] bg-[#EED9D5]/30' : 'border-[#E3D9CE] hover:border-[#B5756A]/40'}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files?.[0]) }}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#E3D9CE] border-t-[#B5756A] animate-spin" />
            <p className="text-sm" style={{ color: '#B5756A' }}>Claude is reading your piece…</p>
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
        {[
          { field: 'type', options: TYPE_OPTIONS, label: 'type' },
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
            onClick={() => { const f = { type: '', fit: '', formality: '', season: '' }; setFilters(f); fetchClothes(f) }}
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
      ) : clothes.length === 0 ? (
        <div className="text-center py-24 space-y-2">
          <p className="serif-italic text-2xl" style={{ color: '#C4B5AC' }}>nothing here yet</p>
          <p className="text-sm" style={{ color: '#C4B5AC' }}>upload your first piece above</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {clothes.map(item => (
            <ClothingCard key={item.id} item={item} onEdit={setEditingItem} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {editingItem && (
        <EditModal item={editingItem} onSave={updated => { setClothes(p => p.map(c => c.id === updated.id ? updated : c)); setEditingItem(null) }} onClose={() => setEditingItem(null)} />
      )}
    </div>
  )
}
