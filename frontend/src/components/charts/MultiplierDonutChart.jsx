import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CATEGORICAL, INK } from '../../lib/colors'
import { formatCr } from '../../lib/format'

const MULTIPLIERS = ['5X', '7X', '10X', '15X']

function aggregateByMultiplier(opportunities) {
  const buckets = new Map(MULTIPLIERS.map((m) => [m, { count: 0, valueCr: 0 }]))
  const other = { count: 0, valueCr: 0 }
  for (const o of opportunities) {
    const m = o.opportunity_multiplier
    const value = o.tentative_value_cr ?? 0
    const bucket = buckets.has(m) ? buckets.get(m) : m ? other : null
    if (bucket) {
      bucket.count += 1
      bucket.valueCr += value
    }
  }
  const data = MULTIPLIERS.map((multiplier, i) => ({
    multiplier,
    count: buckets.get(multiplier).count,
    valueCr: buckets.get(multiplier).valueCr,
    fill: CATEGORICAL[i],
  })).filter((d) => d.count > 0)
  if (other.count > 0) data.push({ multiplier: 'Other', count: other.count, valueCr: other.valueCr, fill: '#c3c2b7' })
  return data
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { multiplier, count, valueCr } = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-sm">
      <div className="font-medium text-gray-900">{multiplier}</div>
      <div className="text-gray-600">{count} opportunities</div>
      <div className="text-gray-600">{formatCr(valueCr)}</div>
    </div>
  )
}

// A style/fill prop on <Pie> itself leaks into every sector's inline style and
// overrides its per-slice fill attribute, so label text color must be set here
// on the <text> node instead, not on <Pie>.
function renderSliceLabel({ cx, cy, midAngle, outerRadius, multiplier, percent, valueCr }) {
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 18
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const anchor = x > cx ? 'start' : 'end'
  return (
    <text x={x} y={y} fill={INK.secondary} fontSize={11} textAnchor={anchor} dominantBaseline="central">
      <tspan x={x} dy="-0.6em">{`${multiplier}: ${Math.round(percent * 100)}%`}</tspan>
      <tspan x={x} dy="1.2em">{formatCr(valueCr)}</tspan>
    </text>
  )
}

export default function MultiplierDonutChart({ opportunities }) {
  const data = aggregateByMultiplier(opportunities)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Pipeline by opportunity multiple</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart margin={{ top: 28, right: 40, bottom: 0, left: 40 }}>
          <Pie
            data={data}
            dataKey="count"
            nameKey="multiplier"
            innerRadius={45}
            outerRadius={65}
            paddingAngle={2}
            label={renderSliceLabel}
            labelLine={false}
          >
            {data.map((d) => (
              <Cell key={d.multiplier} fill={d.fill} stroke="#fcfcfb" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={28}
            formatter={(value) => <span style={{ color: INK.secondary, fontSize: 12 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
