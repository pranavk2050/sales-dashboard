export async function fetchOpportunities(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  )
  const res = await fetch(`/api/opportunities?${qs.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch opportunities')
  return res.json()
}

export async function fetchOpportunityHistory(oppId) {
  const res = await fetch(`/api/opportunities/${encodeURIComponent(oppId)}/history`)
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

export async function fetchRecentChanges(limit = 20) {
  const res = await fetch(`/api/changes/recent?limit=${limit}`)
  if (!res.ok) throw new Error('Failed to fetch recent changes')
  return res.json()
}

export async function fetchLostOpportunities() {
  const res = await fetch('/api/lost')
  if (!res.ok) throw new Error('Failed to fetch lost opportunities')
  return res.json()
}

export async function fetchThisWeek() {
  const res = await fetch('/api/this-week')
  if (!res.ok) throw new Error('Failed to fetch this week')
  return res.json()
}

export async function fetchAlerts() {
  const res = await fetch('/api/alerts')
  if (!res.ok) throw new Error('Failed to fetch alerts')
  return res.json()
}

export async function acknowledgeAlert(alertId) {
  const res = await fetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to acknowledge alert')
  return res.json()
}

export async function fetchInterBU() {
  const res = await fetch('/api/interbu')
  if (!res.ok) throw new Error('Failed to fetch Inter BU data')
  return res.json()
}

export async function fetchInterBUNotes(bu, month) {
  const qs = new URLSearchParams({ bu, month })
  const res = await fetch(`/api/interbu/notes?${qs.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch discussion notes')
  return res.json()
}

export async function saveInterBUNotes(bu, month, discussion_notes) {
  const res = await fetch('/api/interbu/notes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bu, month, discussion_notes }),
  })
  if (!res.ok) throw new Error('Failed to save discussion notes')
  return res.json()
}

export function interBUReportUrl(bu, month) {
  const qs = new URLSearchParams({ bu, month })
  return `/api/interbu/report?${qs.toString()}`
}

export async function createOpportunity(payload) {
  const res = await fetch('/api/opportunities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Failed to create opportunity')
  return res.json()
}

export async function updateOpportunity(oppId, payload) {
  const res = await fetch(`/api/opportunities/${encodeURIComponent(oppId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Failed to update opportunity')
  return res.json()
}

export async function markOpportunityLost(oppId, payload) {
  const res = await fetch(`/api/opportunities/${encodeURIComponent(oppId)}/mark-lost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Failed to mark opportunity lost')
  return res.json()
}

export async function createLostRecord(payload) {
  const res = await fetch('/api/lost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Failed to create lost record')
  return res.json()
}

export async function updateLostRecord(oppId, payload) {
  const res = await fetch(`/api/lost/${encodeURIComponent(oppId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Failed to update lost record')
  return res.json()
}

export async function createInterBUProject(payload) {
  const res = await fetch('/api/interbu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Failed to create Inter BU project')
  return res.json()
}

export async function updateInterBUProject(bu, project, payload) {
  const res = await fetch(`/api/interbu/${encodeURIComponent(bu)}/${encodeURIComponent(project)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Failed to update Inter BU project')
  return res.json()
}
