import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchOpportunities } from '../lib/api'

const POLL_INTERVAL_MS = 20000

export function useOpportunities(filters) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const filtersKey = JSON.stringify(filters)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const reload = useCallback(async () => {
    try {
      const rows = await fetchOpportunities(filtersRef.current)
      setData(rows)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  useEffect(() => {
    const id = setInterval(reload, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [reload])

  return { data, loading, error, reload }
}
