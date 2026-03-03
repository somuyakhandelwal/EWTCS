'use client'
// US-16.2: Offline optimistic stage overlay
//
// When a nurse queues a stage update while offline, the bed card should
// immediately reflect the new stage (optimistic UI) rather than staying
// frozen at the old stage until reconnection.
//
// This hook maintains a bedId→stageId overlay that is merged with the
// server-sourced BedGridData for display. The overlay is cleared
// automatically once the network returns and the queue finishes draining.

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { BedGridData } from '../types/bed'

interface UseOfflineOptimisticStagesParams {
  data: BedGridData
  isOffline: boolean
  pendingCount: number
  /** The interceptor's handleStageSelect — accepts optional expectedStageId for US-16.4. */
  handleStageSelect: (bedId: string, stageId: string, expectedStageId?: string) => Promise<void>
}

interface UseOfflineOptimisticStagesReturn {
  /** BedGridData with offline optimistic stage overrides applied */
  displayData: BedGridData
  /**
   * Replacement for handleStageSelect: queues the update via the interceptor
   * AND immediately reflects the new stage on the bed card when offline.
   */
  handleStageSelectOptimistic: (bedId: string, stageId: string) => Promise<void>
}

export function useOfflineOptimisticStages({
  data,
  isOffline,
  pendingCount,
  handleStageSelect,
}: UseOfflineOptimisticStagesParams): UseOfflineOptimisticStagesReturn {
  // bedId → optimistic stageId while writes are queued
  const [optimisticStages, setOptimisticStages] = useState<Record<string, string>>({})

  // Clear overlay once back online and the queue has fully drained
  useEffect(() => {
    if (!isOffline && pendingCount === 0) {
      setOptimisticStages({})
    }
  }, [isOffline, pendingCount])

  // Merge optimistic overrides into the data snapshot used for display
  const displayData = useMemo<BedGridData>(() => {
    if (Object.keys(optimisticStages).length === 0) return data
    return {
      ...data,
      beds: data.beds.map((bed) => {
        const optimisticStageId = optimisticStages[bed.id]
        if (!optimisticStageId) return bed
        const optimisticStage = data.stages.find((s) => s.id === optimisticStageId)
        if (!optimisticStage) return bed
        return {
          ...bed,
          currentStageId: optimisticStageId,
          currentStage: optimisticStage,
          elapsedTimeMs: 0,
          isDelayed: false,
        }
      }),
    }
  }, [data, optimisticStages])

  const handleStageSelectOptimistic = useCallback(
    async (bedId: string, stageId: string) => {
      // ── Offline ward-access guard ───────────────────────────────────────────
      // Mirrors server-side checkWardAccess: nurses may only update beds in their
      // own ward. Virtual/temporary beds (surge/hallway) bypass this restriction,
      // as does the absence of userWardId (admin, supervisor, floater nurse).
      // This is defense-in-depth — the server enforces the same rule, but blocking
      // early prevents a confusing "queued then failed on sync" experience.
      const bed = displayData.beds.find(b => b.id === bedId)
      if (
        data.userWardId &&
        bed &&
        !bed.isVirtual &&
        !bed.isTemporary &&
        bed.wardId !== undefined &&
        bed.wardId !== data.userWardId
      ) {
        // Bed is outside this nurse's ward — silently block the queue operation.
        return
      }

      // US-16.4: capture the currently displayed stage so the server can detect
      // conflicts if another user moved the bed while this client was offline.
      const expectedStageId = bed?.currentStageId ?? undefined
      await handleStageSelect(bedId, stageId, expectedStageId)
      // Apply visual overlay immediately when offline so the nurse sees the change
      if (isOffline) {
        setOptimisticStages((prev) => ({ ...prev, [bedId]: stageId }))
      }
    },
    [handleStageSelect, isOffline, displayData.beds, data.userWardId],
  )

  return { displayData, handleStageSelectOptimistic }
}
