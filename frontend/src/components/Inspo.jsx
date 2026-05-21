import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL ?? ''

function Spinner({ size = 'sm' }) {
  const dim = size === 'lg' ? 'w-10 h-10' : 'w-5 h-5'
  return <div className={`${dim} rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin`} />
}

function InspoCard({ item, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const detectedText = item.items_detected?.map((d) => `${d.type}${d.color ? ` · ${d.color}` : ''}`).join(', ')

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="aspect-square overflow-hidden bg-stone-100 relative">
        <img
          src={`${API}${item.image_url}`}
          alt="Inspo"
          className="w-full h-full object-cover"
        />

        {/* Hover overlay with detected items */}
        {hovered && item.items_detected?.length > 0 && (
          <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-3">
            <p className="text-white text-xs leading-relaxed">{detectedText}</p>
          </div>
        )}

        {/* Delete button */}
        {hovered && (
          <button
            onClick={() => onDelete(item.id)}
            className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-stone-600 hover:text-rose-600 rounded-full w-7 h-7 flex items-center justify-center shadow-sm transition-all duration-200"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {item.style_notes && (
        <div className="p-3">
          <p className="text-xs italic text-stone-500 line-clamp-2">{item.style_notes}</p>
        </div>
      )}
    </div>
  )
}

function RecommendationCard({ rec }) {
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-stone-800 capitalize">{rec.item_type}</h4>
        <span className="text-xs bg-white text-stone-400 border border-stone-100 px-2 py-0.5 rounded-full whitespace-nowrap">
          Saved {rec.inspo_count}× in inspo
        </span>
      </div>
      {rec.owned_count !== undefined && (
        <p className="text-xs text-stone-400">
          {rec.owned_count > 0
            ? `You own ${rec.owned_count} similar piece${rec.owned_count > 1 ? 's' : ''}`
            : 'Not in your wardrobe yet'}
        </p>
      )}
      <p className="text-sm text-stone-600">{rec.suggestion}</p>
    </div>
  )
}

export default function Inspo() {
  const [inspoItems, setInspoItems] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [totalInspoItems, setTotalInspoItems] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [loadingRecs, setLoadingRecs] = useState(true)
  const [loadingInspo, setLoadingInspo] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const fetchInspo = async () => {
    setLoadingInspo(true)
    try {
      const res = await axios.get(`${API}/api/inspo`)
      setInspoItems(res.data)
    } catch (err) {
      console.error('Failed to fetch inspo:', err)
    } finally {
      setLoadingInspo(false)
    }
  }

  const fetchRecommendations = async () => {
    setLoadingRecs(true)
    try {
      const res = await axios.get(`${API}/api/inspo/recommendations`)
      setRecommendations(res.data.recommendations || [])
      setTotalInspoItems(res.data.total_inspo_items || 0)
    } catch (err) {
      console.error('Failed to fetch recommendations:', err)
    } finally {
      setLoadingRecs(false)
    }
  }

  useEffect(() => {
    fetchInspo()
    fetchRecommendations()
  }, [])

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await axios.post(`${API}/api/inspo/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setInspoItems((prev) => [res.data, ...prev])
      // Refresh recommendations after upload
      fetchRecommendations()
    } catch (err) {
      setError('Upload failed. Please try again.')
      setTimeout(() => setError(''), 4000)
    } finally {
      setUploading(false)
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
      await axios.delete(`${API}/api/inspo/${id}`)
      setInspoItems((prev) => prev.filter((i) => i.id !== id))
      fetchRecommendations()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl text-stone-800 mb-1">Style Inspo</h2>
        <p className="text-sm text-stone-400">
          Save images that inspire you — we'll spot patterns and suggest your capsule wardrobe
        </p>
      </div>

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
            <Spinner size="lg" />
            <p className="text-sm text-rose-500 font-medium">Analyzing your inspo...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-stone-600">Drop Pinterest screenshots or inspo photos here</p>
            <p className="text-xs text-stone-400">PNG, JPG, WEBP up to 10MB</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-100 text-rose-600 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Capsule Recommendations */}
      {!loadingRecs && recommendations.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg text-stone-800">Your Capsule Wardrobe Gaps ✦</h3>
            <p className="text-sm text-stone-400 mt-0.5">
              Based on your inspo, you keep gravitating toward these pieces
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        </div>
      )}

      {loadingRecs && (
        <div className="flex justify-center py-4">
          <Spinner size="lg" />
        </div>
      )}

      {/* Inspo grid */}
      <div className="space-y-4">
        {inspoItems.length > 0 && (
          <h3 className="text-lg text-stone-800">
            Your Inspo Board
            <span className="text-sm font-normal text-stone-400 ml-2">({inspoItems.length} saved)</span>
          </h3>
        )}

        {loadingInspo ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : inspoItems.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-4xl">📌</div>
            <p className="text-stone-500 font-medium">No inspo saved yet</p>
            <p className="text-sm text-stone-400">Upload screenshots from Pinterest, Instagram, or anywhere you find style inspiration</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {inspoItems.map((item) => (
              <InspoCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
