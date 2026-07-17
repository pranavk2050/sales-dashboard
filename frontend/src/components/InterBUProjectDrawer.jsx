import { useEffect, useState } from 'react'
import { createInterBUProject, updateInterBUProject } from '../lib/api'

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-sm text-gray-900 mt-0.5">{children}</div>
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <input {...props} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
    </div>
  )
}

function toDraft(p, presetBU, presetGroupLabel) {
  return {
    bu: p?.bu ?? presetBU ?? '',
    project: p?.project ?? '',
    group_label: p?.group_label ?? presetGroupLabel ?? '',
    team_members: p?.team_members ?? '',
    meeting_status: p?.meeting_status ?? '',
    present_status: p?.present_status ?? '',
    service_lines: p?.service_lines ?? '',
    status: p?.status ?? '',
    stage: p?.stage ?? '',
    responsible: p?.responsible ?? '',
    target_date: p?.target_date ?? '',
    tentative_value_cr: p?.tentative_value_cr ?? '',
    name: p?.name ?? '',
    designation: p?.designation ?? '',
  }
}

function draftToPayload(draft) {
  return {
    group_label: draft.group_label || null,
    team_members: draft.team_members || null,
    meeting_status: draft.meeting_status || null,
    present_status: draft.present_status || null,
    service_lines: draft.service_lines || null,
    status: draft.status || null,
    stage: draft.stage || null,
    responsible: draft.responsible || null,
    target_date: draft.target_date || null,
    tentative_value_cr: draft.tentative_value_cr === '' ? null : Number(draft.tentative_value_cr),
    name: draft.name || null,
    designation: draft.designation || null,
  }
}

export default function InterBUProjectDrawer({ project, creating, presetBU, presetGroupLabel, onClose, onSaved }) {
  const isOpen = creating || !!project
  const [draft, setDraft] = useState(toDraft(project, presetBU, presetGroupLabel))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const buLocked = !creating || !!presetBU

  useEffect(() => {
    setDraft(toDraft(creating ? null : project, presetBU, presetGroupLabel))
    setError(null)
  }, [project, creating, presetBU, presetGroupLabel])

  if (!isOpen) return null

  const setField = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (creating) {
        await createInterBUProject({ bu: draft.bu, project: draft.project, ...draftToPayload(draft) })
      } else {
        await updateInterBUProject(project.bu, project.project, draftToPayload(draft))
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-xl overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {creating ? 'Add project' : `${project.bu} — ${project.project}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <div className="space-y-4">
          {buLocked ? (
            <Field label="BU">{draft.bu}</Field>
          ) : (
            <Input label="BU" value={draft.bu} onChange={setField('bu')} placeholder="e.g. HCBU" />
          )}
          {!buLocked && (
            <Input
              label="Group label"
              value={draft.group_label}
              onChange={setField('group_label')}
              placeholder="e.g. Domestic"
            />
          )}
          {creating ? (
            <Input label="Project" value={draft.project} onChange={setField('project')} />
          ) : (
            <Field label="Project">{draft.project}</Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Meeting status" value={draft.meeting_status} onChange={setField('meeting_status')} placeholder="e.g. Meeting done" />
            <Input label="Stage" value={draft.stage} onChange={setField('stage')} placeholder="e.g. 10X" />
            <Input label="Responsible" value={draft.responsible} onChange={setField('responsible')} />
            <Input label="Target date" type="date" value={draft.target_date} onChange={setField('target_date')} />
            <Input label="Value (Cr)" type="number" step="0.01" value={draft.tentative_value_cr} onChange={setField('tentative_value_cr')} />
            <Input label="Service lines" value={draft.service_lines} onChange={setField('service_lines')} />
          </div>
          <Input label="Status" value={draft.status} onChange={setField('status')} />
          <Input label="Present status / discussion" value={draft.present_status} onChange={setField('present_status')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Team members" value={draft.team_members} onChange={setField('team_members')} />
            <Input label="Name" value={draft.name} onChange={setField('name')} />
          </div>
          <Input label="Designation" value={draft.designation} onChange={setField('designation')} />

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (creating && (!draft.bu || !draft.project))}
              className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
