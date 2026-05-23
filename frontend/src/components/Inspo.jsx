import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ClothesLoader from './ClothesLoader'

const API = import.meta.env.VITE_API_URL ?? ''

function InspoCard({ item, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const detectedText = item.items_detected?.map(d => d.type).join(' · ')

  return (
    <div
      className="relative rounded-xl overflow-hidden border transition-all duration-200"
      style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="aspect-square relative overflow-hidden" style={{ backgroundColor: '#F0EAE2' }}>
        <img src={`${API}${item.image_url}`} alt="inspo" className="w-full h-full object-cover" />
        {hovered && item.items_detected?.length > 0 && (
          <div className="absolute inset-0 flex flex-col justify-end p-3" style={{ backgroundColor: 'rgba(45,26,14,0.6)' }}>
            <p className="text-white text-xs leading-relaxed">{detectedText}</p>
          </div>
        )}
        {hovered && (
          <button
            onClick={() => onDelete(item.id)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(250,247,242,0.9)', color: '#9B8E84' }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {item.style_notes && (
        <div className="px-3 py-2">
          <p className="text-xs italic line-clamp-2" style={{ color: '#9B8E84' }}>{item.style_notes}</p>
        </div>
      )}
    </div>
  )
}

function RecCard({ rec }) {
  return (
    <div className="rounded-2xl border p-4 space-y-2 transition-all" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="serif text-base capitalize" style={{ color: '#2D1A0E' }}>{rec.item_type}</h4>
        <span className="text-xs rounded-full px-2.5 py-0.5 shrink-0" style={{ backgroundColor: '#F0DADA', color: '#6B1010' }}>
          saved {rec.inspo_count}×
        </span>
      </div>
      <p className="text-xs" style={{ color: rec.owned_count > 0 ? '#9B8E84' : '#8B1A1A' }}>
        {rec.owned_count > 0 ? `you own ${rec.owned_count} similar piece${rec.owned_count > 1 ? 's' : ''}` : 'not in your closet yet'}
      </p>
      <p className="text-sm" style={{ color: '#4A3020' }}>{rec.suggestion}</p>
    </div>
  )
}

export default function Inspo() {
  const [inspoItems, setInspoItems] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [uploading, setUploading] = useState(false)
  const [loadingInspo, setLoadingInspo] = useState(true)
  const [loadingRecs, setLoadingRecs] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const fetchInspo = async () => {
    setLoadingInspo(true)
    try { const res = await axios.get(`${API}/api/inspo`); setInspoItems(res.data) }
    finally { setLoadingInspo(false) }
  }

  const fetchRecs = async () => {
    setLoadingRecs(true)
    try { const res = await axios.get(`${API}/api/inspo/recommendations`); setRecommendations(res.data.recommendations || []) }
    finally { setLoadingRecs(false) }
  }

  useEffect(() => { fetchInspo(); fetchRecs() }, [])

  const [uploadStatus, setUploadStatus] = useState('')

  const handleUpload = async (files) => {
    const list = files instanceof FileList ? Array.from(files) : [files]
    if (!list.length) return
    setUploading(true)
    for (let i = 0; i < list.length; i++) {
      setUploadStatus(list.length > 1 ? `analyzing ${i + 1} of ${list.length}…` : 'analyzing your inspo…')
      try {
        const fd = new FormData()
        fd.append('image', list[i])
        const res = await axios.post(`${API}/api/inspo/upload`, fd)
        setInspoItems(p => [res.data, ...p])
      } catch {
        // continue with remaining
      }
    }
    fetchRecs()
    setUploading(false)
    setUploadStatus('')
  }

  const handleDelete = async (id) => {
    await axios.delete(`${API}/api/inspo/${id}`)
    setInspoItems(p => p.filter(i => i.id !== id))
    fetchRecs()
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h2 className="serif-italic text-3xl leading-snug" style={{ color: '#2D1A0E' }}>the inspo board</h2>
        <p className="text-sm mt-1" style={{ color: '#9B8E84' }}>
          save what inspires you — we'll figure out what's missing from your closet
        </p>
      </div>

      {/* Upload */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${dragOver ? 'border-[#8B1A1A] bg-[#F0DADA]/30' : 'border-[#E3D9CE] hover:border-[#8B1A1A]/40'}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { handleUpload(e.target.files); e.target.value = '' }} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <ClothesLoader />
            <p className="text-sm" style={{ color: '#8B1A1A' }}>{uploadStatus}</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="serif-italic text-xl" style={{ color: '#9B8E84' }}>drop inspo here</p>
            <p className="text-xs tracking-wide" style={{ color: '#C4B5AC' }}>pinterest screenshots, editorials, anything</p>
          </div>
        )}
      </div>

      {/* Capsule recommendations */}
      {!loadingRecs && recommendations.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="serif text-lg" style={{ color: '#2D1A0E' }}>your capsule gaps</h3>
            <p className="text-sm mt-0.5" style={{ color: '#9B8E84' }}>
              pieces you keep saving but don't own yet
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => <RecCard key={i} rec={rec} />)}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="space-y-4">
        {inspoItems.length > 0 && (
          <div className="flex items-center justify-between">
            <h3 className="serif text-lg" style={{ color: '#2D1A0E' }}>saved</h3>
            <span className="text-xs" style={{ color: '#9B8E84' }}>{inspoItems.length} images</span>
          </div>
        )}

        {loadingInspo ? (
          <div className="flex justify-center py-20">
            <ClothesLoader />
          </div>
        ) : inspoItems.length === 0 ? (
          <div className="text-center py-24 space-y-2">
            <p className="serif-italic text-2xl" style={{ color: '#C4B5AC' }}>nothing saved yet</p>
            <p className="text-sm" style={{ color: '#C4B5AC' }}>upload screenshots from pinterest, instagram, anywhere</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {inspoItems.map(item => <InspoCard key={item.id} item={item} onDelete={handleDelete} />)}
          </div>
        )}
      </div>
    </div>
  )
}
