import { apiFetch } from './apiFetch'

export async function login(email, password) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Login failed')
  return res.json()
}

export async function logout() {
  await apiFetch('/api/auth/logout', { method: 'POST' })
}

export async function fetchCurrentUser() {
  const res = await apiFetch('/api/auth/me')
  if (!res.ok) return null
  return res.json()
}
