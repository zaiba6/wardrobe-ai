import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './components/Login'
import ClothesLoader from './components/ClothesLoader'
import Wardrobe from './components/Wardrobe'
import GetDressed from './components/GetDressed'
import Inspo from './components/Inspo'
import OutfitsWorn from './components/OutfitsWorn'
import WeekPlanner from './components/WeekPlanner'
import Settings from './components/Settings'
import StylistChat from './components/StylistChat'

const TABS = [
  { key: 'closet',    label: 'the floordrobe' },
  { key: 'chat',      label: 'ask the closet' },
  { key: 'inspo',     label: 'inspo board' },
  { key: 'today',     label: "today's look" },
  { key: 'week',      label: 'week planner' },
  { key: 'worn',      label: 'outfits worn' },
  { key: 'settings',  label: 'settings' },
]

function AppShell() {
  const { user, loading, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('closet')
  const [menuOpen, setMenuOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF7F2' }}>
        <ClothesLoader />
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF7F2' }}>
      {/* Cream strip behind the iPhone status bar so content never scrolls under the clock */}
      <div className="fixed inset-x-0 top-0 z-[60] pointer-events-none" style={{ height: 'env(safe-area-inset-top)', backgroundColor: '#FAF7F2' }} />

      {/* Title row scrolls away; only the tab bar stays pinned */}
      <header style={{ backgroundColor: '#FAF7F2', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-4xl mx-auto px-5 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="serif-italic text-[26px] sm:text-3xl leading-tight whitespace-nowrap" style={{ color: '#2D1A0E' }}>
              wait what do i wear?
            </h1>
            <p className="text-[10px] sm:text-xs mt-1 tracking-widest uppercase" style={{ color: '#9B8E84' }}>
              check your floordrobe
            </p>
          </div>

          {/* Avatar opens a small account menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-2 rounded-full"
              aria-label="account"
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover border"
                  style={{ borderColor: '#E3D9CE' }}
                />
              ) : (
                <span className="w-9 h-9 rounded-full flex items-center justify-center serif-italic text-base border" style={{ backgroundColor: '#F0DADA', borderColor: '#E3D9CE', color: '#8B1A1A' }}>
                  {(user.name || '?').slice(0, 1).toLowerCase()}
                </span>
              )}
              <span className="text-xs hidden sm:block" style={{ color: '#9B8E84' }}>{user.name}</span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-[70]" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 z-[80] w-48 rounded-2xl border p-3 shadow-lg" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
                  <p className="text-sm font-medium truncate" style={{ color: '#2D1A0E' }}>{user.name}</p>
                  <p className="text-xs truncate mb-3" style={{ color: '#9B8E84' }}>{user.email}</p>
                  <button
                    onClick={() => { setMenuOpen(false); logout() }}
                    className="w-full text-sm rounded-full py-2 border"
                    style={{ borderColor: '#E3D9CE', color: '#8B1A1A' }}
                  >
                    sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <nav
        className="sticky z-50 border-b"
        style={{ top: 'env(safe-area-inset-top)', backgroundColor: 'rgba(250,247,242,0.96)', borderColor: '#E3D9CE', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}
      >
        <div className="max-w-4xl mx-auto flex gap-6 overflow-x-auto px-5 sm:px-6 pt-2 no-scrollbar" style={{ overscrollBehaviorX: 'contain' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className={`pb-3 text-sm whitespace-nowrap transition-all duration-200 border-b-2 ${
                activeTab === tab.key
                  ? 'border-[#8B1A1A] text-[#8B1A1A] font-medium'
                  : 'border-transparent text-[#9B8E84] hover:text-[#2D1A0E]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-5 sm:px-6 py-6 sm:py-10" style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}>
        {activeTab === 'closet'   && <Wardrobe />}
        {activeTab === 'chat'     && <StylistChat />}
        {activeTab === 'today'    && <GetDressed />}
        {activeTab === 'week'     && <WeekPlanner />}
        {activeTab === 'worn'     && <OutfitsWorn />}
        {activeTab === 'inspo'    && <Inspo />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
