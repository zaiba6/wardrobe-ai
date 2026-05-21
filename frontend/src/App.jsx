import { useState } from 'react'
import Wardrobe from './components/Wardrobe'
import GetDressed from './components/GetDressed'
import Inspo from './components/Inspo'

const TABS = [
  { key: 'closet', label: 'the closet' },
  { key: 'today', label: "today's look" },
  { key: 'inspo', label: 'inspo board' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('closet')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF7F2' }}>
      <header className="border-b sticky top-0 z-50" style={{ backgroundColor: '#FAF7F2', borderColor: '#E3D9CE' }}>
        <div className="max-w-4xl mx-auto px-6 pt-6 pb-0">
          <div className="mb-5">
            <h1 className="serif-italic text-3xl leading-none" style={{ color: '#1C1917' }}>
              IHaveNothingToWear.ai
            </h1>
            <p className="text-xs mt-1.5 tracking-widest uppercase" style={{ color: '#9B8E84' }}>
              your personal style archive
            </p>
          </div>

          <nav className="flex gap-8">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm transition-all duration-200 border-b-2 ${
                  activeTab === tab.key
                    ? 'border-[#B5756A] text-[#B5756A] font-medium'
                    : 'border-transparent text-[#9B8E84] hover:text-[#1C1917]'
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
        {activeTab === 'today' && <GetDressed />}
        {activeTab === 'inspo' && <Inspo />}
      </main>
    </div>
  )
}
