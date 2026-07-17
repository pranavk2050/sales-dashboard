import { useState } from 'react'
import AlertsBell from './components/AlertsBell'
import { useAuth } from './hooks/useAuth'
import InterBU from './pages/InterBU'
import LiveOpportunities from './pages/LiveOpportunities'
import Login from './pages/Login'
import LostOpportunities from './pages/LostOpportunities'
import ProposalsSubmitted from './pages/ProposalsSubmitted'

const TABS = [
  { key: 'live', label: 'Live Opportunities' },
  { key: 'lost', label: 'Lost/Abandoned' },
  { key: 'proposals', label: 'Proposals Submitted' },
  { key: 'interbu', label: 'Inter BU' },
]

const PAGES = {
  live: LiveOpportunities,
  lost: LostOpportunities,
  proposals: ProposalsSubmitted,
  interbu: InterBU,
}

function App() {
  const [tab, setTab] = useState('live')
  const { status, user, onLoginSuccess, logout } = useAuth()
  const Page = PAGES[tab]

  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-50" />
  }

  if (status === 'anon') {
    return <Login onSuccess={onLoginSuccess} />
  }

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
            <span className="text-xs text-gray-500">Signed in as {user.display_name}</span>
            <button type="button" onClick={logout} className="text-xs text-gray-500 hover:text-gray-700">
              Log out
            </button>
            <AlertsBell />
          </div>
        </nav>
      </div>

      <Page />
    </div>
  )
}

export default App
