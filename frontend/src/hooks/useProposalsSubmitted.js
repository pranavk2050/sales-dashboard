import { useCallback, useEffect, useState } from 'react'
import { fetchProposalsSubmitted } from '../lib/api'

const POLL_INTERVAL_MS = 20000
const EMPTY = { total: 0, weekly: [], monthly: [], opportunities: [] }

export function useProposalsSubmitted() {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(
    () =>
      fetchProposalsSubmitted()
        .then((result) => {
          setData(result)
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
