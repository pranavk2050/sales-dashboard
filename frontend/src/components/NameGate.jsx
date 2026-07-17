import { useState } from 'react'
import { getUserName, setUserName } from '../lib/currentUser'

export default function NameGate() {
  const [name, setName] = useState(getUserName())
  const [editing, setEditing] = useState(!name)
  const [draft, setDraft] = useState(name)

  const save = () => {
    if (!draft.trim()) return
    setUserName(draft)
    setName(draft.trim())
    setEditing(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(name)
          setEditing(true)
        }}
        className="text-xs text-gray-500 hover:text-gray-700"
        title="Click to change your name"
      >
        {name ? `Editing as ${name}` : 'Set your name'}
      </button>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">What's your name?</h2>
            <p className="text-xs text-gray-500 mb-3">
              Credited on edits you make in the dashboard (e.g. "Timeline changed by …").
            </p>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder="Your name"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3"
            />
            <div className="flex justify-end gap-2">
              {name && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={save}
                disabled={!draft.trim()}
                className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
