import { useState } from 'react'
import OpportunityDrawer from '../components/OpportunityDrawer'
import ProposalsSubmittedTable from '../components/ProposalsSubmittedTable'
import TrendCountChart from '../components/charts/TrendCountChart'
import { formatShortMonth, formatWeekLabel } from '../lib/format'
import { useProposalsSubmitted } from '../hooks/useProposalsSubmitted'

export default function ProposalsSubmitted() {
  const { data, loading, error, reload } = useProposalsSubmitted()
  const [selected, setSelected] = useState(null)

  const weeklyChartData = data.weekly.map((w) => ({ label: formatWeekLabel(w.week_start), count: w.count }))
  const monthlyChartData = data.monthly.map((m) => ({ label: formatShortMonth(m.month), count: m.count }))

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Proposals Submitted</h1>
        <p className="text-gray-500 text-sm mt-1">
          All opportunities where a proposal has been submitted to the customer, regardless of current status.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
          <div className="text-sm text-gray-500">Total submitted</div>
          <div className="text-3xl font-semibold text-gray-900 mt-1">{data.total}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TrendCountChart title="Weekly proposals submitted (last 12 weeks)" data={weeklyChartData} />
        <TrendCountChart title="Monthly proposals submitted (last 12 months)" data={monthlyChartData} />
      </div>

      {error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <ProposalsSubmittedTable opportunities={data.opportunities} loading={loading} onRowClick={setSelected} />
      )}

      {selected && (
        <OpportunityDrawer
          opportunity={selected}
          creating={false}
          onClose={() => setSelected(null)}
          onSaved={reload}
        />
      )}
    </div>
  )
}
