import { useEffect, useState } from 'react'
import { createOpportunity, markOpportunityLost, updateOpportunity } from '../lib/api'
import { getUserName } from '../lib/currentUser'
import { formatCr } from '../lib/format'
import HistoryTimeline from './HistoryTimeline'
import OppLeadId from './OppLeadId'
import TimelineBadge from './TimelineBadge'

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
    enquiry_description: o?.enquiry_description ?? '',
    tentative_value_cr: o?.tentative_value_cr ?? '',
    opportunity_multiplier: o?.opportunity_multiplier ?? '',
    progress: o?.progress ?? '',
    expected_quarter: o?.expected_quarter ?? '',
    present_status: o?.present_status ?? '',
    timeline: o?.timeline ?? '',
    delivery_team: o?.delivery_team ?? '',
    sales_team: o?.sales_team ?? '',
  }
}

function draftToPayload(draft) {
  return {
    customer: draft.customer || null,
    enquiry_description: draft.enquiry_description || null,
    tentative_value_cr: draft.tentative_value_cr === '' ? null : Number(draft.tentative_value_cr),
    opportunity_multiplier: draft.opportunity_multiplier || null,
    progress: draft.progress === '' ? null : Number(draft.progress),
    expected_quarter: draft.expected_quarter || null,
    present_status: draft.present_status || null,
    timeline: draft.timeline || null,
    delivery_team: draft.delivery_team || null,
    sales_team: draft.sales_team || null,
  }
}

export default function OpportunityDrawer({ opportunity, creating, onClose, onSaved }) {
  const isOpen = creating || !!opportunity
  const [current, setCurrent] = useState(creating ? null : opportunity)
  const [isEditing, setIsEditing] = useState(!!creating)
  const [draft, setDraft] = useState(toDraft(creating ? null : opportunity))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [markingLost, setMarkingLost] = useState(false)
  const [lostReason, setLostReason] = useState('')

  useEffect(() => {
    setCurrent(creating ? null : opportunity)
    setDraft(toDraft(creating ? null : opportunity))
    setIsEditing(!!creating)
    setMarkingLost(false)
    setLostReason('')
    setError(null)
  }, [opportunity, creating])

  if (!isOpen) return null

  const setField = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const changed_by = getUserName() || 'Anonymous'
      if (creating) {
        await createOpportunity({
          opp_lead_no: draft.opp_lead_no || undefined,
          ...draftToPayload(draft),
          changed_by,
        })
        onSaved()
        onClose()
      } else {
        const updated = await updateOpportunity(current.opp_lead_no, {
          ...draftToPayload(draft),
          changed_by,
        })
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

  const handleMarkLost = async () => {
    if (!lostReason.trim()) return
    setSaving(true)
    setError(null)
    try {
      const changed_by = getUserName() || 'Anonymous'
      await markOpportunityLost(current.opp_lead_no, { lost_reason: lostReason, changed_by })
      onSaved()
      onClose()
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
              {creating ? 'Add opportunity' : (o.customer ?? '—')}
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
            <Input label="Enquiry description" value={draft.enquiry_description} onChange={setField('enquiry_description')} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Tentative value (Cr)" type="number" step="0.01" value={draft.tentative_value_cr} onChange={setField('tentative_value_cr')} />
              <Input label="Opportunity" value={draft.opportunity_multiplier} onChange={setField('opportunity_multiplier')} placeholder="e.g. 10X" />
              <Input label="Progress" type="number" value={draft.progress} onChange={setField('progress')} />
              <Input label="Expected quarter" value={draft.expected_quarter} onChange={setField('expected_quarter')} placeholder="e.g. Q3" />
              <Input label="Timeline" type="date" value={draft.timeline} onChange={setField('timeline')} />
            </div>
            <Input label="Present status" value={draft.present_status} onChange={setField('present_status')} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Delivery team" value={draft.delivery_team} onChange={setField('delivery_team')} />
              <Input label="Sales team" value={draft.sales_team} onChange={setField('sales_team')} />
            </div>

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
              <Field label="SL No.">{o.sl_no ?? '—'}</Field>
              <Field label="Opportunity">{o.opportunity_multiplier ?? '—'}</Field>
              <Field label="Tentative value">{formatCr(o.tentative_value_cr)}</Field>
              <Field label="Progress">{o.progress ?? '—'}</Field>
              <Field label="Expected">{o.expected_quarter ?? '—'}</Field>
              <Field label="Timeline">
                <TimelineBadge
                  timeline={o.timeline}
                  isOverdue={o.is_overdue}
                  dueWithin7Days={o.due_within_7_days}
                  daysOverdue={o.days_overdue}
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Enquiry description">{o.enquiry_description ?? '—'}</Field>
            </div>
            <div className="mt-4">
              <Field label="Present status">{o.present_status ?? '—'}</Field>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
              <Field label="Delivery team involved">{o.delivery_team ?? '—'}</Field>
              <Field label="Sales team involved">{o.sales_team ?? '—'}</Field>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
              >
                Edit
              </button>
              {!markingLost && (
                <button
                  type="button"
                  onClick={() => setMarkingLost(true)}
                  className="text-sm px-3 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-50"
                >
                  Mark as Lost
                </button>
              )}
            </div>

            {markingLost && (
              <div className="mt-3 p-3 bg-red-50 rounded border border-red-100">
                <textarea
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  placeholder="Why was this lost?"
                  rows={2}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleMarkLost}
                    disabled={saving || !lostReason.trim()}
                    className="text-sm px-3 py-1.5 rounded bg-red-600 text-white disabled:opacity-40 hover:bg-red-700"
                  >
                    {saving ? 'Saving…' : 'Confirm lost'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarkingLost(false)}
                    className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100">
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">History</h3>
              <HistoryTimeline oppId={o.opp_lead_no} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
