import { useState } from 'react'
import Wardrobe from './components/Wardrobe'
import GetDressed from './components/GetDressed'
import Inspo from './components/Inspo'

const TABS = ['My Wardrobe', 'Get Dressed', 'Inspo']

export default function App() {
  const [activeTab, setActiveTab] = useState('My Wardrobe')

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Top nav */}
      <header className="bg-white border-b border-stone-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col items-center gap-4">
          <h1 className="text-2xl text-stone-800 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            wardrobe.ai
          </h1>
          {/* Tab bar */}
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                  activeTab === tab
                    ? 'border-rose-400 text-rose-600'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Tab content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {activeTab === 'My Wardrobe' && <Wardrobe />}
        {activeTab === 'Get Dressed' && <GetDressed />}
        {activeTab === 'Inspo' && <Inspo />}
      </main>
    </div>
  )
}
