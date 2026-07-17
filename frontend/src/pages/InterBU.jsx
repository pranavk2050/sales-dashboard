import { useMemo, useState } from 'react'
import InterBUCard from '../components/InterBUCard'
import InterBUProjectDrawer from '../components/InterBUProjectDrawer'
import { useInterBU } from '../hooks/useInterBU'
import { currentMonth } from '../lib/format'
import { groupInterBU } from '../lib/groupInterBU'

export default function InterBU() {
  const { data, loading, error, reload } = useInterBU()
  const [month, setMonth] = useState(currentMonth())
  const [addingProject, setAddingProject] = useState(false)
  const groups = useMemo(() => groupInterBU(data), [data])

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inter BU</h1>
          <p className="text-gray-500 text-sm mt-1">Monthly cadence calls with BUs and SMG members.</p>
        </div>
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => setAddingProject(true)}
            className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Add project
          </button>
          <div className="flex flex-col items-end">
            <label className="text-xs text-gray-500 mb-1">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 py-8 text-center">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        groups.map(({ group, bus }) => (
          <div key={group} className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{group}</h2>
            <div className="space-y-3">
              {bus.map(({ bu, projects }) => (
                <InterBUCard key={bu} bu={bu} projects={projects} month={month} onChanged={reload} />
              ))}
            </div>
          </div>
        ))
      )}

      {addingProject && (
        <InterBUProjectDrawer
          creating={addingProject}
          onClose={() => setAddingProject(false)}
          onSaved={reload}
        />
      )}
    </div>
  )
}
