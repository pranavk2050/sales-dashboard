export default function MeetingStatusBadge({ status }) {
  const isDone = (status || '').trim().toLowerCase() === 'meeting done'
  if (!status) {
    return <span className="text-gray-400 text-xs">—</span>
  }
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {status}
    </span>
  )
}
