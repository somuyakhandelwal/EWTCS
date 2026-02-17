// Custom hook for managing bed update state and timers
// Extracted from BedDashboardClient to maintain 200-line limit

import { useState, useRef, useEffect, useCallback } from 'react'

const ERROR_CLEAR_MS = 5000

interface UseErrorTimersReturn {
  errorByBedId: Record<string, string>
  setTemporaryError: (bedId: string, message: string) => void
  clearError: (bedId: string) => void
}

/**
 * Hook to manage temporary error messages with auto-clear timers
 * Prevents memory leaks by tracking and cleaning up all timers
 */
export function useErrorTimers(): UseErrorTimersReturn {
  const [errorByBedId, setErrorByBedId] = useState<Record<string, string>>({})
  const errorClearTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = errorClearTimers.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const setTemporaryError = useCallback((bedId: string, message: string) => {
    setErrorByBedId((prev) => ({ ...prev, [bedId]: message }))

    // Clear previous timer for this bed
    const previousTimer = errorClearTimers.current.get(bedId)
    if (previousTimer) {
      clearTimeout(previousTimer)
    }

    // Set new auto-clear timer
    const timer = setTimeout(() => {
      setErrorByBedId((prev) => {
        if (!prev[bedId]) return prev
        const next = { ...prev }
        delete next[bedId]
        return next
      })
      errorClearTimers.current.delete(bedId)
    }, ERROR_CLEAR_MS)

    errorClearTimers.current.set(bedId, timer)
  }, [])

  const clearError = useCallback((bedId: string) => {
    setErrorByBedId((prev) => {
      if (!prev[bedId]) return prev
      const next = { ...prev }
      delete next[bedId]
      return next
    })
  }, [])

  return { errorByBedId, setTemporaryError, clearError }
}

interface UseSuccessFeedbackReturn {
  lastUpdatedBedId: string | null
  lastUpdatedStageId: string | null
  showSuccessFeedback: (bedId: string, stageId: string) => void
}

/**
 * Hook to manage success feedback with auto-clear timer
 */
export function useSuccessFeedback(feedbackDurationMs: number): UseSuccessFeedbackReturn {
  const [lastUpdatedBedId, setLastUpdatedBedId] = useState<string | null>(null)
  const [lastUpdatedStageId, setLastUpdatedStageId] = useState<string | null>(null)
  const successTimer = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (successTimer.current) {
        clearTimeout(successTimer.current)
      }
    }
  }, [])

  const showSuccessFeedback = useCallback(
    (bedId: string, stageId: string) => {
      setLastUpdatedBedId(bedId)
      setLastUpdatedStageId(stageId)

      // Clear previous timer
      if (successTimer.current) {
        clearTimeout(successTimer.current)
      }

      // Set new timer to clear feedback
      successTimer.current = setTimeout(() => {
        setLastUpdatedBedId(null)
        setLastUpdatedStageId(null)
        successTimer.current = null
      }, feedbackDurationMs)
    },
    [feedbackDurationMs]
  )

  return { lastUpdatedBedId, lastUpdatedStageId, showSuccessFeedback }
}
