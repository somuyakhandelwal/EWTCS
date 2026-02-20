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

  // Watch for stage update to enable Undo
  useEffect(() => {
    if (lastUpdatedBedId && lastUpdatedStageId) {
      setUndoState({ bedId: lastUpdatedBedId, prevStageId: lastUpdatedStageId, timer: 30 })
      if (undoTimerRef.current) clearInterval(undoTimerRef.current)
      undoTimerRef.current = setInterval(() => {
        setUndoState(prev => {
          if (!prev) return null
          if (prev.timer <= 1) {
            clearInterval(undoTimerRef.current!)
            return null
          }
          return { ...prev, timer: prev.timer - 1 }
        })
      }, 1000)
    }
    return () => {
      if (undoTimerRef.current) clearInterval(undoTimerRef.current)
    }
  }, [lastUpdatedBedId, lastUpdatedStageId])

  const [undoError, setUndoError] = useState<string | null>(null)

  const handleUndo = useCallback(async () => {
    if (!undoState) return
    setUndoError(null)
    try {
      const res = await fetch('/src/features/bed-dashboard/api/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedId: undoState.bedId, prevStageId: undoState.prevStageId }),
      })
      const data = await res.json()
      if (!data.success) {
        setUndoError(data.error || 'Undo failed')
      }
    } catch {
      setUndoError('Undo failed')
    }
    setUndoState(null)
    if (undoTimerRef.current) clearInterval(undoTimerRef.current)
    await handleRefresh()
  }, [undoState, handleRefresh])

  return { undoState, undoError, handleUndo }
}
