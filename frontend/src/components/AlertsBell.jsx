import { useEffect, useState } from 'react'
import { acknowledgeAlert, fetchAlerts } from '../lib/api'

const POLL_INTERVAL_MS = 20000

export default function AlertsBell() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [alerts, setAlerts] = useState([])

  const load = () => {
    fetchAlerts()
      .then((data) => {
        setUnreadCount(data.unread_count)
        setAlerts(data.alerts)
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const dismiss = async (alertId) => {
    await acknowledgeAlert(alertId)
    load()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded hover:bg-gray-100"
        aria-label="Alerts"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-semibold text-white bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-2 border-b border-gray-100 text-sm font-medium text-gray-700">
            Alerts {alerts.length > 0 && `(${alerts.length})`}
          </div>
          {alerts.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-400 text-center">No open alerts.</div>
          ) : (
            <ul>
              {alerts.map((a) => (
                <li key={a.id} className="px-4 py-3 border-b border-gray-50 last:border-0 flex justify-between gap-3">
                  <span className="text-sm text-gray-800">{a.message}</span>
                  <button
                    type="button"
                    onClick={() => dismiss(a.id)}
                    className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
