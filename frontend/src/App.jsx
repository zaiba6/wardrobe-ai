import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './components/Login'
import ClothesLoader from './components/ClothesLoader'
import Wardrobe from './components/Wardrobe'
import GetDressed from './components/GetDressed'
import Inspo from './components/Inspo'
import OutfitsWorn from './components/OutfitsWorn'

const TABS = [
  { key: 'closet', label: 'the floordrobe' },
  { key: 'inspo',  label: 'inspo board' },
  { key: 'today',  label: "today's look" },
  { key: 'worn',   label: 'outfits worn' },
]

function AppShell() {
  const { user, loading, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('closet')

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
      <header className="border-b sticky top-0 z-50" style={{ backgroundColor: '#FAF7F2', borderColor: '#E3D9CE' }}>
        <div className="max-w-4xl mx-auto px-6 pt-6 pb-0">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h1 className="serif-italic text-3xl leading-none" style={{ color: '#2D1A0E' }}>
                wait what do i wear?
              </h1>
              <p className="text-xs mt-1.5 tracking-widest uppercase" style={{ color: '#9B8E84' }}>
                check your floordrobe
              </p>
            </div>

            {/* User avatar + logout */}
            <div className="flex items-center gap-2 mt-1 shrink-0">
              {user.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border"
                  style={{ borderColor: '#E3D9CE' }}
                />
              )}
              <span className="text-xs hidden sm:block" style={{ color: '#9B8E84' }}>{user.name}</span>
              <button
                onClick={logout}
                className="text-[10px] rounded-full px-2.5 py-1 border transition-all hover:bg-[#F0EAE2]"
                style={{ borderColor: '#E3D9CE', color: '#9B8E84' }}
              >
                sign out
              </button>
            </div>
          </div>

          <nav className="flex gap-6 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm whitespace-nowrap transition-all duration-200 border-b-2 ${
                  activeTab === tab.key
                    ? 'border-[#8B1A1A] text-[#8B1A1A] font-medium'
                    : 'border-transparent text-[#9B8E84] hover:text-[#2D1A0E]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {activeTab === 'closet' && <Wardrobe />}
        {activeTab === 'today'  && <GetDressed />}
        {activeTab === 'worn'   && <OutfitsWorn />}
        {activeTab === 'inspo'  && <Inspo />}
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
