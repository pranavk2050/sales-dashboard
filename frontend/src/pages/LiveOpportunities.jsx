import { useMemo, useState } from 'react'
import KpiCards from '../components/KpiCards'
import FiltersBar from '../components/FiltersBar'
import OpportunitiesTable from '../components/OpportunitiesTable'
import OpportunityDrawer from '../components/OpportunityDrawer'
import ValueByCustomerChart from '../components/charts/ValueByCustomerChart'
import QuarterCountChart from '../components/charts/QuarterCountChart'
import MultiplierDonutChart from '../components/charts/MultiplierDonutChart'
import RecentChangesFeed from '../components/RecentChangesFeed'
import ThisWeekPanel from '../components/ThisWeekPanel'
import { useOpportunities } from '../hooks/useOpportunities'

const DEFAULT_FILTERS = { sort_by: 'timeline', sort_dir: 'asc' }

export default function LiveOpportunities() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)

  // Unfiltered live set drives KPIs and charts; the table respects the active filters.
  const all = useOpportunities(useMemo(() => ({}), []))
  const filtered = useOpportunities(filters)

  const handleSaved = () => {
    all.reload()
    filtered.reload()
  }

  const closeDrawer = () => {
    setSelected(null)
    setCreating(false)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Live Opportunities</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your live opportunities and leads.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Add opportunity
        </button>
      </div>

      <ThisWeekPanel />

      <KpiCards opportunities={all.data} />

      <RecentChangesFeed />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ValueByCustomerChart opportunities={all.data} />
        <QuarterCountChart opportunities={all.data} />
        <MultiplierDonutChart opportunities={all.data} />
      </div>

      <FiltersBar filters={filters} onChange={setFilters} />

      {filtered.error ? (
        <div className="text-sm text-red-600">{filtered.error}</div>
      ) : (
        <OpportunitiesTable
          opportunities={filtered.data}
          loading={filtered.loading}
          onRowClick={setSelected}
        />
      )}

      {(creating || selected) && (
        <OpportunityDrawer
          opportunity={selected}
          creating={creating}
          onClose={closeDrawer}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
