import { formatDate } from '../lib/format'

export default function TimelineBadge({ timeline, isOverdue, dueWithin7Days, daysOverdue }) {
  let classes = 'bg-gray-100 text-gray-700'
  let label = formatDate(timeline)
  if (isOverdue) {
    classes = 'bg-red-100 text-red-700'
    label = `${formatDate(timeline)} · Overdue ${daysOverdue}d`
  } else if (dueWithin7Days) {
    classes = 'bg-amber-100 text-amber-700'
    label = `${formatDate(timeline)} · Due soon`
  }
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${classes}`}>{label}</span>
}
