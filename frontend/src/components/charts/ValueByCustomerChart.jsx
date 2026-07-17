import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCr } from '../../lib/format'
import { GRID, INK, SERIES_1 } from '../../lib/colors'

function aggregateByCustomer(opportunities) {
  const totals = new Map()
  for (const o of opportunities) {
    const key = o.customer ?? 'Unknown'
    totals.set(key, (totals.get(key) ?? 0) + (o.tentative_value_cr ?? 0))
  }
  return Array.from(totals, ([customer, value]) => ({ customer, value })).sort((a, b) => b.value - a.value)
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { customer, value } = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-sm">
      <div className="font-medium text-gray-900">{customer}</div>
      <div className="text-gray-600">{formatCr(value)}</div>
    </div>
  )
}

export default function ValueByCustomerChart({ opportunities }) {
  const data = aggregateByCustomer(opportunities)
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Value by customer</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="customer" tick={{ fontSize: 11, fill: INK.muted }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11, fill: INK.muted }} width={40} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar dataKey="value" fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
