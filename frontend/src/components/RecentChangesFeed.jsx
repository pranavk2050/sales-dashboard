import { useEffect, useState } from 'react'
import { fetchRecentChanges } from '../lib/api'
import { formatRecentChangeLine } from '../lib/changeFormat'
import { formatDate } from '../lib/format'

const POLL_INTERVAL_MS = 20000

function formatDetectedAt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${formatDate(d.toISOString().slice(0, 10))} ${d.toTimeString().slice(0, 5)}`
}

export default function RecentChangesFeed() {
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () => fetchRecentChanges(20).then(setChanges).catch(() => {}).finally(() => setLoading(false))
    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Recent changes</h3>
      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : changes.length === 0 ? (
        <div className="text-sm text-gray-400">No changes recorded yet.</div>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {changes.map((c) => (
            <li key={c.id} className="text-sm flex justify-between gap-4">
              <span className="text-gray-800">{formatRecentChangeLine(c)}</span>
              <span className="text-xs text-gray-400 whitespace-nowrap">{formatDetectedAt(c.detected_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
