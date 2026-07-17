import { useCallback, useEffect, useState } from 'react'
import { fetchLostOpportunities } from '../lib/api'

const POLL_INTERVAL_MS = 20000

export function useLostOpportunities() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(
    () =>
      fetchLostOpportunities()
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
