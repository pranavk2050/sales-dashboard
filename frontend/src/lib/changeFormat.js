import { formatCr, formatDate } from './format'

const FIELD_LABELS = {
  customer: 'Customer',
  enquiry_description: 'Enquiry description',
  tentative_value_cr: 'Tentative value',
  opportunity_multiplier: 'Opportunity',
  progress: 'Progress',
  expected_quarter: 'Expected quarter',
  present_status: 'Present status',
  timeline: 'Timeline',
  delivery_team: 'Delivery team',
  sales_team: 'Sales team',
}

function formatValue(field, value) {
  if (value === null || value === undefined) return '—'
  if (field === 'timeline') return formatDate(value)
  if (field === 'tentative_value_cr') return formatCr(parseFloat(value))
  return value
}

// Core description of a change, without which opportunity it belongs to - used in the
// per-opportunity History timeline where that context is already the drawer itself.
export function formatChangeLine(change) {
  if (change.field === 'created') {
    return change.new_value ? `Created — ${change.new_value}` : 'Created'
  }
  if (change.field === 'marked_lost') {
    return 'Marked as lost'
  }
  const label = FIELD_LABELS[change.field] || change.field
  const verb = change.field === 'timeline' ? 'moved' : 'changed'
  return `${label} ${verb}: ${formatValue(change.field, change.old_value)} → ${formatValue(change.field, change.new_value)}`
}

// Same, but prefixed with the opportunity it belongs to - for the global "Recent changes" feed.
export function formatRecentChangeLine(change) {
  const who = change.customer ? `${change.opp_id} (${change.customer})` : change.opp_id
  return `${who}: ${formatChangeLine(change)}`
}
