import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GRID, INK, SERIES_1 } from '../../lib/colors'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

function aggregateByQuarter(opportunities) {
  const counts = new Map(QUARTERS.map((q) => [q, 0]))
  for (const o of opportunities) {
    const q = o.expected_quarter
    if (counts.has(q)) counts.set(q, counts.get(q) + 1)
  }
  return QUARTERS.map((quarter) => ({ quarter, count: counts.get(quarter) }))
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { quarter, count } = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-sm">
      <div className="font-medium text-gray-900">{quarter}</div>
      <div className="text-gray-600">{count} opportunities</div>
    </div>
  )
}

export default function QuarterCountChart({ opportunities }) {
  const data = aggregateByQuarter(opportunities)
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Count by expected quarter</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: INK.muted }} />
          <YAxis tick={{ fontSize: 11, fill: INK.muted }} width={30} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar dataKey="count" fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
