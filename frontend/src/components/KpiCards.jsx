import { formatCr } from '../lib/format'

function KpiCard({ label, value, tone = 'neutral' }) {
  const valueClass = tone === 'critical' && value > 0 ? 'text-red-600' : 'text-gray-900'
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-3xl font-semibold mt-1 ${valueClass}`}>{value}</div>
    </div>
  )
}

export default function KpiCards({ opportunities }) {
  const totalCount = opportunities.length
  const totalValue = opportunities.reduce((sum, o) => sum + (o.tentative_value_cr ?? 0), 0)
  const dueThisWeek = opportunities.filter((o) => o.due_within_7_days).length
  const overdue = opportunities.filter((o) => o.is_overdue).length

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard label="Total opportunities" value={totalCount} />
      <KpiCard label="Total tentative value" value={formatCr(totalValue)} />
      <KpiCard label="Due this week" value={dueThisWeek} />
      <KpiCard label="Overdue" value={overdue} tone="critical" />
    </div>
  )
}
