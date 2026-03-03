// useUndoManager — encapsulates undo timer state and handleUndo logic
// Extracted from BedDashboardClient to keep that file under 200 lines
// US-16.2: Undo is blocked when browser is offline

import { useState, useRef, useEffect, useCallback } from 'react'

export function useUndoManager(
  lastUpdatedBedId: string | null | undefined,
  lastUpdatedStageId: string | null | undefined,
  handleRefresh: () => Promise<void> | void,
  /** US-16.2: When true, undo is blocked — cannot reach the server */
  isOffline = false,
) {
  const [undoState, setUndoState] = useState<{
    bedId: string
    prevStageId: string
    timer: number
  } | null>(null)
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null)

  const lastSeenUpdateRef = useRef<string | null>(null)

  useEffect(() => {
    // Only react when BOTH are non-null (a real new update arrived)
    if (!lastUpdatedBedId || !lastUpdatedStageId) return

    const key = `${lastUpdatedBedId}:${lastUpdatedStageId}`
    // Skip if we already started the timer for this exact update
    if (lastSeenUpdateRef.current === key) return
    lastSeenUpdateRef.current = key

    // Reset and start a fresh 30s countdown
    setUndoState({ bedId: lastUpdatedBedId, prevStageId: lastUpdatedStageId, timer: 30 })

    if (undoTimerRef.current) clearInterval(undoTimerRef.current)

    undoTimerRef.current = setInterval(() => {
      setUndoState(prev => {
        if (!prev) return null
        if (prev.timer <= 1) {
          clearInterval(undoTimerRef.current!)
          undoTimerRef.current = null
          lastSeenUpdateRef.current = null
          return null
        }
        return { ...prev, timer: prev.timer - 1 }
      })
    }, 1000)

    // NOTE: No cleanup return here — the interval manages its own lifecycle.
    // Returning a cleanup would kill the interval when lastUpdatedBedId/StageId
    // auto-clear to null (after 3s success feedback), breaking the 30s undo window.
  }, [lastUpdatedBedId, lastUpdatedStageId])

  // Separate unmount-only cleanup — avoids premature interval cancellation on dep changes
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearInterval(undoTimerRef.current)
        undoTimerRef.current = null
      }
    }
  }, [])

  const [undoError, setUndoError] = useState<string | null>(null)
  // Bug 1 fix: track in-flight undo to prevent double-click and show loading state
  const [isUndoing, setIsUndoing] = useState(false)

  const handleUndo = useCallback(async () => {
    if (!undoState || isUndoing) return

    // US-16.2: block undo while offline — the API call would fail anyway
    if (isOffline) {
      setUndoError('Cannot undo while offline. Please reconnect and try again.')
      return
    }

    setUndoError(null)
    setIsUndoing(true)

    // Capture before any state change — state will still be set during the fetch
    const { bedId } = undoState

    try {
      const res = await fetch('/api/bed-dashboard/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedId }),
      })
      const data = await res.json()

      if (!data.success) {
        // Bug 1 fix: keep button visible; show error — do NOT clear undoState on failure
        setUndoError(data.error || 'Undo failed')
      } else {
        // Only clear button + refresh on confirmed success
        setUndoState(null)
        if (undoTimerRef.current) {
          clearInterval(undoTimerRef.current)
          undoTimerRef.current = null
        }
        lastSeenUpdateRef.current = null
        // Bug 2 fix: only refresh when undo actually succeeded
        await handleRefresh()
      }
    } catch {
      setUndoError('Undo failed — please try again')
    } finally {
      setIsUndoing(false)
    }
  }, [undoState, isUndoing, isOffline, handleRefresh])

  return { undoState, undoError, handleUndo, isUndoing }
}
