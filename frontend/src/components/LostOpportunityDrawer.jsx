import { useEffect, useState } from 'react'
import { createLostRecord, updateLostRecord } from '../lib/api'
import { formatCr, formatDate } from '../lib/format'
import OppLeadId from './OppLeadId'

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

function toDraft(o) {
  return {
    opp_lead_no: o?.opp_lead_no ?? '',
    customer: o?.customer ?? '',
    description: o?.description ?? '',
    tentative_value_cr: o?.tentative_value_cr ?? '',
    opportunity_multiplier: o?.opportunity_multiplier ?? '',
    expected_quarter: o?.expected_quarter ?? '',
    lost_reason: o?.lost_reason ?? '',
    date_lost: o?.date_lost ?? '',
    team_member_1: o?.team_member_1 ?? '',
    team_member_2: o?.team_member_2 ?? '',
    notes: o?.notes ?? '',
  }
}

function draftToPayload(draft) {
  return {
    customer: draft.customer || null,
    description: draft.description || null,
    tentative_value_cr: draft.tentative_value_cr === '' ? null : Number(draft.tentative_value_cr),
    opportunity_multiplier: draft.opportunity_multiplier || null,
    expected_quarter: draft.expected_quarter || null,
    lost_reason: draft.lost_reason || null,
    date_lost: draft.date_lost || null,
    team_member_1: draft.team_member_1 || null,
    team_member_2: draft.team_member_2 || null,
    notes: draft.notes || null,
  }
}

export default function LostOpportunityDrawer({ record, creating, onClose, onSaved }) {
  const isOpen = creating || !!record
  const [current, setCurrent] = useState(creating ? null : record)
  const [isEditing, setIsEditing] = useState(!!creating)
  const [draft, setDraft] = useState(toDraft(creating ? null : record))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setCurrent(creating ? null : record)
    setDraft(toDraft(creating ? null : record))
    setIsEditing(!!creating)
    setError(null)
  }, [record, creating])

  if (!isOpen) return null

  const setField = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (creating) {
        await createLostRecord({
          opp_lead_no: draft.opp_lead_no || undefined,
          ...draftToPayload(draft),
        })
        onSaved()
        onClose()
      } else {
        const updated = await updateLostRecord(current.opp_lead_no, draftToPayload(draft))
        setCurrent(updated)
        setDraft(toDraft(updated))
        setIsEditing(false)
        onSaved()
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const o = current

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-xl overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            {!creating && (
              <div className="text-xs text-gray-500">
                <OppLeadId oppLeadNo={o.opp_lead_no} hasSyntheticId={o.has_synthetic_id} />
              </div>
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {creating ? 'Add lost record' : (o.customer ?? '—')}
            </h2>
          </div>
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

        {isEditing ? (
          <div className="space-y-4">
            {creating && <Input label="Opp/Lead No. (optional)" value={draft.opp_lead_no} onChange={setField('opp_lead_no')} placeholder="Leave blank to auto-assign" />}
            <Input label="Customer" value={draft.customer} onChange={setField('customer')} />
            <Input label="Description" value={draft.description} onChange={setField('description')} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Value (Cr)" type="number" step="0.01" value={draft.tentative_value_cr} onChange={setField('tentative_value_cr')} />
              <Input label="Opportunity" value={draft.opportunity_multiplier} onChange={setField('opportunity_multiplier')} placeholder="e.g. 10X" />
              <Input label="Quarter" value={draft.expected_quarter} onChange={setField('expected_quarter')} placeholder="e.g. Q3" />
              <Input label="Date lost" type="date" value={draft.date_lost} onChange={setField('date_lost')} />
            </div>
            <Input label="Lost reason" value={draft.lost_reason} onChange={setField('lost_reason')} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Team member 1" value={draft.team_member_1} onChange={setField('team_member_1')} />
              <Input label="Team member 2" value={draft.team_member_2} onChange={setField('team_member_2')} />
            </div>
            <Input label="Notes" value={draft.notes} onChange={setField('notes')} />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {!creating && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setDraft(toDraft(current))
                  }}
                  className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Opportunity">{o.opportunity_multiplier ?? '—'}</Field>
              <Field label="Value">{formatCr(o.tentative_value_cr)}</Field>
              <Field label="Quarter">{o.expected_quarter ?? '—'}</Field>
              <Field label="Date lost">{formatDate(o.date_lost)}</Field>
            </div>
            <div className="mt-4">
              <Field label="Description">{o.description ?? '—'}</Field>
            </div>
            <div className="mt-4">
              <Field label="Lost reason">{o.lost_reason ?? '—'}</Field>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="Team member 1">{o.team_member_1 ?? '—'}</Field>
              <Field label="Team member 2">{o.team_member_2 ?? '—'}</Field>
            </div>
            <div className="mt-4">
              <Field label="Notes">{o.notes ?? '—'}</Field>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
              >
                Edit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
