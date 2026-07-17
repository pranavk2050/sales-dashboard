import { useCallback, useEffect, useState } from 'react'
import { fetchInterBU } from '../lib/api'

const POLL_INTERVAL_MS = 20000

export function useInterBU() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(
    () =>
      fetchInterBU()
        .then((rows) => {
          setData(rows)
          setError(null)
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    []
  )

  useEffect(() => {
    reload()
    const id = setInterval(reload, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [reload])

  return { data, loading, error, reload }
}
