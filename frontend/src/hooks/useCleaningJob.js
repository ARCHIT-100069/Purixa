import { useState, useEffect, useRef, useCallback } from 'react'
import { getStatus } from '../utils/api'

const POLL_INTERVAL = 1500 // ms

export function useCleaningJob() {
  const [jobId, setJobId] = useState(null)
  const [status, setStatus] = useState(null) // queued | running | done | error
  const [progress, setProgress] = useState(0)
  const [log, setLog] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startJob = useCallback((id) => {
    setJobId(id)
    setStatus('queued')
    setProgress(0)
    setLog([])
    setStats(null)
    setError(null)
  }, [])

  const reset = useCallback(() => {
    stopPolling()
    setJobId(null)
    setStatus(null)
    setProgress(0)
    setLog([])
    setStats(null)
    setError(null)
  }, [stopPolling])

  useEffect(() => {
    if (!jobId) return
    if (status === 'done' || status === 'error') return

    const poll = async () => {
      try {
        const data = await getStatus(jobId)
        setStatus(data.status)
        setProgress(data.progress)
        setLog(data.log || [])
        if (data.stats) setStats(data.stats)
        if (data.error) setError(data.error)

        if (data.status === 'done' || data.status === 'error') {
          stopPolling()
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    poll() // immediate first call
    intervalRef.current = setInterval(poll, POLL_INTERVAL)

    return () => stopPolling()
  }, [jobId, status, stopPolling])

  return {
    jobId,
    status,
    progress,
    log,
    stats,
    error,
    startJob,
    reset,
  }
}
