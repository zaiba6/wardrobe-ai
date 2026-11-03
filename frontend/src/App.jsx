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

// Top text tabs on wider screens
const TABS = [
  { key: 'closet',    label: 'the floordrobe' },
  { key: 'chat',      label: 'ask the closet' },
  { key: 'inspo',     label: 'inspo board' },
  { key: 'today',     label: "today's look" },
  { key: 'week',      label: 'week planner' },
  { key: 'worn',      label: 'outfits worn' },
  { key: 'settings',  label: 'settings' },
]

const ICONS = {
  closet: <path d="M12 4a2.5 2.5 0 0 1 1.5 4.5L12 9.5V11l8 5.5a1.5 1.5 0 0 1-.9 2.5H4.9a1.5 1.5 0 0 1-.9-2.5L12 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  today: <><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
  inspo: <><rect x="3" y="3" width="8" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><rect x="13" y="3" width="8" height="6" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><rect x="13" y="11" width="8" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><rect x="3" y="15" width="8" height="6" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /></>,
  week: <><rect x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
}

// Bottom tab bar on phones — the star in the middle opens ask the closet
const BOTTOM_TABS = [
  { key: 'closet', label: 'closet' },
  { key: 'today',  label: 'today' },
  { key: 'chat',   label: 'ask', center: true },
  { key: 'inspo',  label: 'inspo' },
  { key: 'week',   label: 'week' },
]

function BottomTabBar({ activeTab, onSelect }) {
  return (
    <nav
      className="sm:hidden fixed z-50 left-4 right-4 h-[68px] rounded-full border flex items-center justify-around px-2"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 8px)',
        backgroundColor: 'rgba(255,255,255,0.94)',
        borderColor: '#E3D9CE',
        boxShadow: '0 12px 30px rgba(45,26,14,0.12)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {BOTTOM_TABS.map(tab => {
        const active = activeTab === tab.key
        if (tab.center) {
          return (
            <button
              key={tab.key}
              onClick={() => onSelect(tab.key)}
              aria-label="ask the closet"
              className="w-[50px] h-[50px] -mt-7 rounded-full flex items-center justify-center transition-transform active:scale-90"
              style={{
                background: 'linear-gradient(135deg, #FFF6F1, #F0DADA)',
                boxShadow: `0 0 0 4px #FAF7F2, 0 6px 14px rgba(139,26,26,${active ? 0.3 : 0.16})`,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" className={active ? 'tab-pop' : ''}>
                <path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" fill="#8B1A1A" />
              </svg>
            </button>
          )
        }
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className="w-14 flex flex-col items-center gap-0.5 transition-transform active:scale-90"
            style={{ color: active ? '#8B1A1A' : '#B3A69C' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" className={active ? 'tab-pop' : ''}>{ICONS[tab.key]}</svg>
            <span className="text-[10.5px]">{tab.label}</span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: active ? '#8B1A1A' : 'transparent' }} />
          </button>
        )
      })}
    </nav>
  )
}

function AppShell() {
  const { user, loading, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('today')
  const [menuOpen, setMenuOpen] = useState(false)

  const selectTab = (key) => {
    setActiveTab(key)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
        <div className="max-w-4xl mx-auto px-5 sm:px-6 pt-3 sm:pt-6 pb-1 sm:pb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="serif-italic text-xl sm:text-3xl leading-tight whitespace-nowrap" style={{ color: '#2D1A0E' }}>
              wait what do i wear?
            </h1>
            <p className="hidden sm:block text-xs mt-1 tracking-widest uppercase" style={{ color: '#9B8E84' }}>
              check your floordrobe
            </p>
          </div>

          {/* Avatar opens the account menu (also home to outfits worn + settings on phones) */}
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
                  className="w-9 h-9 rounded-full object-cover border-2"
                  style={{ borderColor: '#fff', boxShadow: '0 4px 10px rgba(139,26,26,0.15)' }}
                />
              ) : (
                <span className="w-9 h-9 rounded-full flex items-center justify-center serif-italic text-base border-2" style={{ background: 'linear-gradient(135deg, #F0DADA, #E8CECE)', borderColor: '#fff', color: '#8B1A1A' }}>
                  {(user.name || '?').slice(0, 1).toLowerCase()}
                </span>
              )}
              <span className="text-xs hidden sm:block" style={{ color: '#9B8E84' }}>{user.name}</span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-[70]" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 z-[80] w-52 rounded-2xl border p-3 shadow-lg pop-in" style={{ backgroundColor: '#fff', borderColor: '#E3D9CE' }}>
                  <p className="text-sm font-medium truncate" style={{ color: '#2D1A0E' }}>{user.name}</p>
                  <p className="text-xs truncate mb-2" style={{ color: '#9B8E84' }}>{user.email}</p>
                  <div className="sm:hidden border-t py-1 mb-2" style={{ borderColor: '#F0EAE2' }}>
                    {[['worn', 'outfits worn'], ['settings', 'settings']].map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => selectTab(key)}
                        className="w-full text-left text-sm py-2"
                        style={{ color: activeTab === key ? '#8B1A1A' : '#4A3020' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
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
        className="hidden sm:block sticky z-50 border-b"
        style={{ top: 'env(safe-area-inset-top)', backgroundColor: 'rgba(250,247,242,0.96)', borderColor: '#E3D9CE', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}
      >
        <div className="max-w-4xl mx-auto flex gap-6 overflow-x-auto px-6 pt-2 no-scrollbar" style={{ overscrollBehaviorX: 'contain' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => selectTab(tab.key)}
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

      <main key={activeTab} className="max-w-4xl mx-auto px-5 sm:px-6 pt-4 sm:pt-10 screen-in" style={{ paddingBottom: 'calc(var(--tabbar-space) + 1.5rem)' }}>
        {activeTab === 'closet'   && <Wardrobe />}
        {activeTab === 'chat'     && <StylistChat />}
        {activeTab === 'today'    && <GetDressed />}
        {activeTab === 'week'     && <WeekPlanner />}
        {activeTab === 'worn'     && <OutfitsWorn />}
        {activeTab === 'inspo'    && <Inspo />}
        {activeTab === 'settings' && <Settings />}
      </main>

      <BottomTabBar activeTab={activeTab} onSelect={selectTab} />
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
