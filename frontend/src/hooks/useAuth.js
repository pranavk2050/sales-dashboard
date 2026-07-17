import { useCallback, useEffect, useState } from 'react'
import { onAuthRequired } from '../lib/apiFetch'
import { fetchCurrentUser, logout as apiLogout } from '../lib/auth'

export function useAuth() {
  const [status, setStatus] = useState('loading') // 'loading' | 'authed' | 'anon'
  const [user, setUser] = useState(null)

  const refresh = useCallback(() => {
    fetchCurrentUser().then((u) => {
      if (u) {
        setUser(u)
        setStatus('authed')
      } else {
        setUser(null)
        setStatus('anon')
      }
    })
  }, [])

  useEffect(() => {
    refresh()
    return onAuthRequired(() => {
      setUser(null)
      setStatus('anon')
    })
  }, [refresh])

  const onLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser)
    setStatus('authed')
  }

  const logout = async () => {
    await apiLogout()
    setUser(null)
    setStatus('anon')
  }

  return { status, user, onLoginSuccess, logout }
}
