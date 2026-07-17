import { formatCr } from '../lib/format'
import OppLeadId from './OppLeadId'
import TimelineBadge from './TimelineBadge'

const COLUMNS = [
  'SL No.', 'Opp/Lead No.', 'Customer', 'Enquiry description', 'Value (Cr)',
  'Opportunity', 'Progress', 'Expected', 'Present status', 'Timeline',
]

export default function OpportunitiesTable({ opportunities, loading, onRowClick }) {
  if (loading) {
    return <div className="text-sm text-gray-500 py-8 text-center">Loading…</div>
  }
  if (opportunities.length === 0) {
    return <div className="text-sm text-gray-500 py-8 text-center">No opportunities match these filters.</div>
  }

  return (
    <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
            {COLUMNS.map((c) => (
              <th key={c} className="px-3 py-2 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {opportunities.map((o) => (
            <tr
              key={o.opp_lead_no}
              onClick={() => onRowClick(o)}
              className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer ${
                o.has_open_alert ? 'bg-red-50/60' : ''
              }`}
            >
              <td className="px-3 py-2">{o.sl_no ?? '—'}</td>
              <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5">
                  {o.has_open_alert && (
                    <span className="text-red-500" title="Overdue with no recent activity">
                      ⚠
                    </span>
                  )}
                  <OppLeadId oppLeadNo={o.opp_lead_no} hasSyntheticId={o.has_synthetic_id} />
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{o.customer ?? '—'}</td>
              <td className="px-3 py-2 max-w-xs truncate" title={o.enquiry_description ?? ''}>
                {o.enquiry_description ?? '—'}
              </td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatCr(o.tentative_value_cr)}</td>
              <td className="px-3 py-2">{o.opportunity_multiplier ?? '—'}</td>
              <td className="px-3 py-2">{o.progress ?? '—'}</td>
              <td className="px-3 py-2">{o.expected_quarter ?? '—'}</td>
              <td className="px-3 py-2 max-w-xs truncate" title={o.present_status ?? ''}>
                {o.present_status ?? '—'}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <TimelineBadge
                  timeline={o.timeline}
                  isOverdue={o.is_overdue}
                  dueWithin7Days={o.due_within_7_days}
                  daysOverdue={o.days_overdue}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
