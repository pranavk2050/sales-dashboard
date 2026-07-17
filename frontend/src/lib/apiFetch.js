const AUTH_REQUIRED_EVENT = 'auth:required'

export async function apiFetch(path, options = {}) {
  const res = await fetch(path, { ...options, credentials: 'include' })
  if (res.status === 401) {
    window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT))
  }
  return res
}

export function onAuthRequired(handler) {
  window.addEventListener(AUTH_REQUIRED_EVENT, handler)
  return () => window.removeEventListener(AUTH_REQUIRED_EVENT, handler)
}
