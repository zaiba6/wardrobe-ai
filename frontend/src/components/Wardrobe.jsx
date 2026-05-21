import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL ?? ''

const TYPE_OPTIONS = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'bag']
const FIT_OPTIONS = ['slim', 'regular', 'relaxed', 'oversized']
const FORMALITY_OPTIONS = ['casual', 'smart casual', 'business casual', 'formal']
const SEASON_OPTIONS = ['spring', 'summer', 'fall', 'winter', 'all-season']

function Spinner() {
  return (
    <div className="w-5 h-5 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
  )
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

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await axios.put(`${API}/api/clothes/${item.id}`, form)
      onSave(res.data)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative h-48 bg-stone-100 rounded-t-2xl overflow-hidden">
          <img
            src={`${API}${item.image_url}`}
            alt={item.type}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-6 space-y-4">
          <h3 className="text-lg font-medium text-stone-800">Edit item</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                <option value="">Select</option>
                {TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Color</label>
              <input
                type="text"
                value={form.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="e.g. cream white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Fit</label>
              <select
                value={form.fit}
                onChange={(e) => handleChange('fit', e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                <option value="">Select</option>
                {FIT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Formality</label>
              <select
                value={form.formality}
                onChange={(e) => handleChange('formality', e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                <option value="">Select</option>
                {FORMALITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-500 mb-1">Season</label>
              <select
                value={form.season}
                onChange={(e) => handleChange('season', e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                <option value="">Select</option>
                {SEASON_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Your notes</label>
            <textarea
              value={form.user_notes}
              onChange={(e) => handleChange('user_notes', e.target.value)}
              rows={2}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              placeholder="Add personal notes..."
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-rose-400 hover:bg-rose-500 text-white rounded-full py-2 text-sm font-medium transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Spinner />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-stone-200 text-stone-600 rounded-full py-2 text-sm font-medium hover:bg-stone-50 transition-all duration-200"
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
      className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="aspect-square overflow-hidden bg-stone-100 relative">
        <img
          src={`${API}${item.image_url}`}
          alt={item.type}
          className="w-full h-full object-cover"
        />
        {/* Hover actions */}
        {hovered && (
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={() => onEdit(item)}
              className="bg-white/90 backdrop-blur-sm text-stone-600 hover:text-rose-600 rounded-full w-7 h-7 flex items-center justify-center shadow-sm transition-all duration-200"
              title="Edit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.5-6.5a2 2 0 012.828 2.828L11.828 13.828A4 4 0 019 15H7v-2a4 4 0 012-3.468z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="bg-white/90 backdrop-blur-sm text-stone-600 hover:text-rose-600 rounded-full w-7 h-7 flex items-center justify-center shadow-sm transition-all duration-200"
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          {item.type && (
            <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium capitalize">
              {item.type}
            </span>
          )}
          {item.fit && (
            <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full capitalize">
              {item.fit}
            </span>
          )}
        </div>
        {item.color && (
          <p className="text-xs text-stone-500 capitalize">{item.color}</p>
        )}
        {item.description && (
          <p className="text-xs text-stone-600 truncate">{item.description}</p>
        )}
      </div>
    </div>
  )
}

export default function Wardrobe() {
  const [clothes, setClothes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [filters, setFilters] = useState({ type: '', fit: '', formality: '', season: '' })
  const [editingItem, setEditingItem] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const fetchClothes = async (activeFilters = filters) => {
    setLoading(true)
    try {
      const params = {}
      if (activeFilters.type) params.type = activeFilters.type
      if (activeFilters.fit) params.fit = activeFilters.fit
      if (activeFilters.formality) params.formality = activeFilters.formality
      if (activeFilters.season) params.season = activeFilters.season
      const res = await axios.get(`${API}/api/clothes`, { params })
      setClothes(res.data)
    } catch (err) {
      console.error('Failed to fetch clothes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClothes()
  }, [])

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value }
    setFilters(newFilters)
    fetchClothes(newFilters)
  }

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    setUploadProgress('Claude is analyzing your outfit...')
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('user_notes', '')
      const res = await axios.post(`${API}/api/clothes/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setClothes((prev) => [res.data, ...prev])
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadProgress('Upload failed. Please try again.')
      setTimeout(() => setUploadProgress(''), 3000)
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
  }

  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/api/clothes/${id}`)
      setClothes((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const handleSaveEdit = (updatedItem) => {
    setClothes((prev) => prev.map((c) => (c.id === updatedItem.id ? updatedItem : c)))
    setEditingItem(null)
  }

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragOver ? 'border-rose-400 bg-rose-50' : 'border-rose-200 bg-white hover:border-rose-300 hover:bg-rose-50/50'
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
            <p className="text-sm text-rose-500 font-medium">{uploadProgress}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-stone-600">Drop a photo of your clothing here, or click to upload</p>
            <p className="text-xs text-stone-400">PNG, JPG, WEBP up to 10MB</p>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Filter by</span>
        {[
          { label: 'Type', field: 'type', options: TYPE_OPTIONS },
          { label: 'Fit', field: 'fit', options: FIT_OPTIONS },
          { label: 'Formality', field: 'formality', options: FORMALITY_OPTIONS },
          { label: 'Season', field: 'season', options: SEASON_OPTIONS },
        ].map(({ label, field, options }) => (
          <select
            key={field}
            value={filters[field]}
            onChange={(e) => handleFilterChange(field, e.target.value)}
            className="text-xs border border-stone-200 rounded-full px-3 py-1.5 bg-white text-stone-600 focus:outline-none focus:ring-2 focus:ring-rose-200 cursor-pointer"
          >
            <option value="">All {label}s</option>
            {options.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
          </select>
        ))}
      </div>

      {/* Stats */}
      <p className="text-sm text-stone-400">
        <span className="text-stone-700 font-medium">{clothes.length}</span> items in your wardrobe
      </p>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
        </div>
      ) : clothes.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl">👗</div>
          <p className="text-stone-500 font-medium">Your wardrobe is empty</p>
          <p className="text-sm text-stone-400">Upload your first clothing item above to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {clothes.map((item) => (
            <ClothingCard
              key={item.id}
              item={item}
              onEdit={setEditingItem}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingItem && (
        <EditModal
          item={editingItem}
          onSave={handleSaveEdit}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  )
}
