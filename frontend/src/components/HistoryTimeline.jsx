import { useEffect, useState } from 'react'
import { fetchOpportunityHistory } from '../lib/api'
import { formatChangeLine } from '../lib/changeFormat'
import { formatDate } from '../lib/format'

function formatDetectedAt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${formatDate(d.toISOString().slice(0, 10))} ${d.toTimeString().slice(0, 5)}`
}

export default function HistoryTimeline({ oppId }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchOpportunityHistory(oppId)
      .then((rows) => {
        if (!cancelled) setEntries(rows)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [oppId])

  if (loading) return <div className="text-sm text-gray-400">Loading history…</div>
  if (error) return <div className="text-sm text-red-600">{error}</div>
  if (entries.length === 0) return <div className="text-sm text-gray-400">No changes recorded yet.</div>

  return (
    <ul className="space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="text-sm border-l-2 border-gray-200 pl-3">
          <div className="text-gray-900">{formatChangeLine(e)}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {formatDetectedAt(e.detected_at)} · {e.changed_by || 'workbook edit'}
          </div>
        </li>
      ))}
    </ul>
  )
}
