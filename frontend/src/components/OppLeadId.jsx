export default function OppLeadId({ oppLeadNo, hasSyntheticId }) {
  if (!hasSyntheticId) {
    return <span>{oppLeadNo}</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
        Lead
      </span>
      <span className="text-gray-400 text-xs">no ID yet</span>
    </span>
  )
}
