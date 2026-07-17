import { useState } from 'react'
import LostOpportunitiesTable from '../components/LostOpportunitiesTable'
import LostOpportunityDrawer from '../components/LostOpportunityDrawer'
import { formatCr } from '../lib/format'
import { useLostOpportunities } from '../hooks/useLostOpportunities'

export default function LostOpportunities() {
  const { data, loading, error, reload } = useLostOpportunities()
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)
  const totalValue = data.reduce((sum, o) => sum + (o.tentative_value_cr ?? 0), 0)

  const closeDrawer = () => {
    setSelected(null)
    setCreating(false)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Lost Opportunities</h1>
          <p className="text-gray-500 text-sm mt-1">Opportunities that moved out of the live pipeline.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Add lost record
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
          <div className="text-sm text-gray-500">Total lost</div>
          <div className="text-3xl font-semibold text-gray-900 mt-1">{data.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
          <div className="text-sm text-gray-500">Total value lost</div>
          <div className="text-3xl font-semibold text-gray-900 mt-1">{formatCr(totalValue)}</div>
        </div>
      </div>

      {error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <LostOpportunitiesTable opportunities={data} loading={loading} onRowClick={setSelected} />
      )}

      {(creating || selected) && (
        <LostOpportunityDrawer
          record={selected}
          creating={creating}
          onClose={closeDrawer}
          onSaved={reload}
        />
      )}
    </div>
  )
}
