import { useEffect, useState } from 'react'
import { formatElapsedTime } from '../lib/utils'
import { subscribeToMinuteTick } from './useMinuteTicker'

/**
 * Hook to compute and update elapsed time from a start timestamp.
 * Updates once per minute to meet acceptance criteria.
 *
 * @param start - start time (Date or ISO string) when patient was admitted
 * @returns formatted elapsed time string (e.g., "2h 45m")
 */
export function useElapsedTime(start: Date | string | null | undefined): string {
  // Normalize incoming start to an ISO string when possible. This prevents
  // frequent re-subscribes if callers pass Date objects recreated on each
  // render (or plain objects from JSON). Use the normalized string in the
  // effect dependency array.
  const normalizedStart: string | null = (() => {
    if (!start) return null
    if (start instanceof Date) return start.toISOString()
    if (typeof start === 'string') return start
    try {
      return new Date(start as Date | string).toISOString()
    } catch {
      return null
    }
  })()

  const [label, setLabel] = useState<string>(() => {
    if (!normalizedStart) return 'N/A'
    try {
      const ms = getElapsedMs(normalizedStart)
      return formatElapsedTime(ms)
    } catch {
      return 'N/A'
    }
  })

  useEffect(() => {
    if (!normalizedStart) {
      setLabel('N/A')
      return
    }

    // subscribe to shared minute ticker; receives an initial immediate call
    const unsubscribe = subscribeToMinuteTick(() => {
      try {
        const ms = getElapsedMs(normalizedStart)
        setLabel(formatElapsedTime(ms))
      } catch {
        setLabel('N/A')
      }
    })

    return unsubscribe
  }, [normalizedStart])

  return label
}

function getElapsedMs(start: Date | string): number {
  const startDate = start instanceof Date ? start : new Date(start as Date | string)
  if (!startDate || Number.isNaN(startDate.getTime())) throw new Error('invalid date')
  const now = new Date()
  return Math.max(0, now.getTime() - startDate.getTime())
}
