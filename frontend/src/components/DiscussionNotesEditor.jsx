import { useEffect, useState } from 'react'
import { fetchInterBUNotes, saveInterBUNotes } from '../lib/api'

export default function DiscussionNotesEditor({ bu, month }) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDirty(false)
    fetchInterBUNotes(bu, month)
      .then((data) => {
        if (!cancelled) setNotes(data.discussion_notes || '')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [bu, month])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveInterBUNotes(bu, month, notes)
      setSavedAt(new Date())
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-sm text-gray-400">Loading notes…</div>

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value)
          setDirty(true)
        }}
        rows={4}
        placeholder="Meeting minutes, action items, follow-ups for this month's cadence call…"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          {saving ? 'Saving…' : 'Save notes'}
        </button>
        {!dirty && savedAt && (
          <span className="text-xs text-gray-400">Saved {savedAt.toTimeString().slice(0, 5)}</span>
        )}
      </div>
    </div>
  )
}
