import { useEffect, useState } from 'react'
import { fetchThisWeek } from '../lib/api'
import { formatDate } from '../lib/format'

const POLL_INTERVAL_MS = 20000

export default function ThisWeekPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () => fetchThisWeek().then(setData).catch(() => {}).finally(() => setLoading(false))
    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  if (loading || !data) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-400">Loading this week's activities…</div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          This week — {data.count} {data.count === 1 ? 'activity' : 'activities'}
        </h3>
        <span className="text-xs text-gray-400">
          {formatDate(data.week_start)} – {formatDate(data.week_end)}
        </span>
      </div>

      {data.opportunities.length === 0 ? (
        <div className="text-sm text-gray-400">Nothing due this week.</div>
      ) : (
        <ul className="space-y-2">
          {data.opportunities.map((o) => (
            <li key={o.opp_lead_no} className="text-sm flex justify-between gap-4 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
              <div className="min-w-0">
                <span className="font-medium text-gray-900">{o.customer ?? 'Unknown customer'}</span>
                <span className="text-gray-500"> — {o.present_status ?? o.enquiry_description ?? 'No status yet'}</span>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(o.timeline)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
