import { useState } from 'react'
import AlertsBell from './components/AlertsBell'
import NameGate from './components/NameGate'
import InterBU from './pages/InterBU'
import LiveOpportunities from './pages/LiveOpportunities'
import LostOpportunities from './pages/LostOpportunities'

const TABS = [
  { key: 'live', label: 'Live Opportunities' },
  { key: 'lost', label: 'Lost' },
  { key: 'interbu', label: 'Inter BU' },
]

const PAGES = {
  live: LiveOpportunities,
  lost: LostOpportunities,
  interbu: InterBU,
}

function App() {
  const [tab, setTab] = useState('live')
  const Page = PAGES[tab]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 pt-4">
        <nav className="flex items-center justify-between border-b border-gray-200">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  tab === t.key
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <NameGate />
            <AlertsBell />
          </div>
        </nav>
      </div>

      <Page />
    </div>
  )
}

export default App
