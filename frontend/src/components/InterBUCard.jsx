import { useState } from 'react'
import DiscussionNotesEditor from './DiscussionNotesEditor'
import InterBUProjectDrawer from './InterBUProjectDrawer'
import MeetingStatusBadge from './MeetingStatusBadge'
import { interBUReportUrl } from '../lib/api'
import { formatDate, formatMonth } from '../lib/format'

export default function InterBUCard({ bu, projects, month, onChanged }) {
  const [expanded, setExpanded] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [addingProject, setAddingProject] = useState(false)
  const meetingsDone = projects.filter((p) => (p.meeting_status || '').trim().toLowerCase() === 'meeting done').length
  const groupLabel = projects[0]?.group_label

  const monthLabel = formatMonth(month)
  const mailSubject = `Inter BU cadence – ${bu} – ${monthLabel}`
  const mailBody = `Please find the Inter BU cadence report for ${bu} — ${monthLabel} below.\n\n(Generate and attach the PDF from the dashboard's "Generate monthly report" button.)`
  const mailtoHref = `mailto:?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`

  const closeDrawers = () => {
    setSelectedProject(null)
    setAddingProject(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
      >
        <div>
          <span className="font-medium text-gray-900">{bu}</span>
          <span className="text-sm text-gray-500 ml-2">{projects.length} project{projects.length === 1 ? '' : 's'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              meetingsDone === projects.length && projects.length > 0
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {meetingsDone}/{projects.length} meetings done
          </span>
          <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="py-1.5 pr-3">Project</th>
                  <th className="py-1.5 pr-3">Meeting status</th>
                  <th className="py-1.5 pr-3">Status</th>
                  <th className="py-1.5 pr-3">Stage</th>
                  <th className="py-1.5 pr-3">Responsible</th>
                  <th className="py-1.5 pr-3">Target date</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr
                    key={p.project}
                    onClick={() => setSelectedProject(p)}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="py-1.5 pr-3 font-medium text-gray-900">{p.project}</td>
                    <td className="py-1.5 pr-3">
                      <MeetingStatusBadge status={p.meeting_status} />
                    </td>
                    <td className="py-1.5 pr-3 max-w-xs truncate" title={p.status ?? p.present_status ?? ''}>
                      {p.status ?? p.present_status ?? '—'}
                    </td>
                    <td className="py-1.5 pr-3">{p.stage ?? '—'}</td>
                    <td className="py-1.5 pr-3">{p.responsible ?? '—'}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{formatDate(p.target_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Discussions / action points — {monthLabel}</h4>
            <DiscussionNotesEditor bu={bu} month={month} />
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setAddingProject(true)}
              className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
            >
              Add project
            </button>
            <a
              href={interBUReportUrl(bu, month)}
              target="_blank"
              rel="noreferrer"
              className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
            >
              Generate monthly report
            </a>
            <a href={mailtoHref} className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">
              Email team
            </a>
          </div>
        </div>
      )}

      {(addingProject || selectedProject) && (
        <InterBUProjectDrawer
          project={selectedProject}
          creating={addingProject}
          presetBU={bu}
          presetGroupLabel={groupLabel}
          onClose={closeDrawers}
          onSaved={onChanged}
        />
      )}
    </div>
  )
}
