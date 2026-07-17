import { formatCr, formatDate } from '../lib/format'
import OppLeadId from './OppLeadId'

const COLUMNS = [
  'Opp/Lead No.', 'Customer', 'Description', 'Value (Cr)', 'Status', 'Proposal submitted', 'Quarter', 'Team',
]

export default function ProposalsSubmittedTable({ opportunities, loading, onRowClick }) {
  if (loading) {
    return <div className="text-sm text-gray-500 py-8 text-center">Loading…</div>
  }
  if (opportunities.length === 0) {
    return <div className="text-sm text-gray-500 py-8 text-center">No proposals submitted yet.</div>
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
              onClick={() => onRowClick?.(o)}
              className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
            >
              <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                <OppLeadId oppLeadNo={o.opp_lead_no} hasSyntheticId={o.has_synthetic_id} />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{o.customer ?? '—'}</td>
              <td className="px-3 py-2 max-w-xs truncate" title={o.enquiry_description ?? ''}>
                {o.enquiry_description ?? '—'}
              </td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatCr(o.tentative_value_cr)}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                    o.is_lost ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}
                >
                  {o.is_lost ? 'Lost' : 'Live'}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{formatDate(o.proposal_submitted_date)}</td>
              <td className="px-3 py-2">{o.expected_quarter ?? '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {[o.delivery_team, o.sales_team].filter(Boolean).join(' / ') || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
