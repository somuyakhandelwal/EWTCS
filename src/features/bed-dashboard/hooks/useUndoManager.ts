// useUndoManager — encapsulates undo timer state and handleUndo logic
// Extracted from BedDashboardClient to keep that file under 200 lines

import { useState, useRef, useEffect, useCallback } from 'react'

export function useUndoManager(
  lastUpdatedBedId: string | null | undefined,
  lastUpdatedStageId: string | null | undefined,
  handleRefresh: () => Promise<void> | void,
) {
  const [undoState, setUndoState] = useState<{
    bedId: string
    prevStageId: string
    timer: number
  } | null>(null)
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Track the last bed+stage pair we actually started a timer for.
  // This prevents the effect from restarting the timer when lastUpdatedBedId
  // auto-clears back to null (the 3s success-feedback expiry).
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

    return () => {
      if (undoTimerRef.current) {
        clearInterval(undoTimerRef.current)
        undoTimerRef.current = null
      }
    }
  }, [lastUpdatedBedId, lastUpdatedStageId])

  const [undoError, setUndoError] = useState<string | null>(null)

  const handleUndo = useCallback(async () => {
    if (!undoState) return
    setUndoError(null)

    // Clear the countdown immediately so the button disappears
    setUndoState(null)
    if (undoTimerRef.current) {
      clearInterval(undoTimerRef.current)
      undoTimerRef.current = null
    }
    lastSeenUpdateRef.current = null

    try {
      const res = await fetch('/api/bed-dashboard/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedId: undoState.bedId }),
      })
      const data = await res.json()
      if (!data.success) {
        setUndoError(data.error || 'Undo failed')
      }
    } catch {
      setUndoError('Undo failed — please try again')
    }

    await handleRefresh()
  }, [undoState, handleRefresh])

  return { undoState, undoError, handleUndo }
}
