'use client'
// US-16.3 / US-16.4: Manages sync result state and conflict resolution logic.
// Designed to be used by BedDashboardClient; keeps conflict modal state decoupled
// from the write interceptor.
// Note: retryDrain is NOT a param here — BedDashboardClient reads it directly from
// useOfflineWriteInterceptor and passes it to SyncStatusBanner.onRetry.

import { useState, useCallback } from 'react'
import type { DrainResult } from './useOfflineQueue'
import type { SyncConflict } from '../components/SyncConflictModal'
import type { SyncResult } from '../components/SyncStatusBanner'
import type { BedGridData } from '../types/bed'

interface UseSyncConflictHandlerParams {
  data: BedGridData
}

interface UseSyncConflictHandlerReturn {
  syncResult: SyncResult | null
  syncConflicts: SyncConflict[]
  isApplyingConflict: boolean
  /** Pass as onSyncComplete to useOfflineWriteInterceptor */
  handleSyncComplete: (result: DrainResult) => void
  handleKeepServer: (entryId: string) => void
  handleForceApply: (entryId: string) => Promise<void>
  clearConflicts: () => void
}

export function useSyncConflictHandler({
  data,
}: UseSyncConflictHandlerParams): UseSyncConflictHandlerReturn {
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([])
  const [isApplyingConflict, setIsApplyingConflict] = useState(false)

  const handleSyncComplete = useCallback(
    (result: DrainResult) => {
      setSyncResult({
        succeeded: result.succeeded,
        failed: result.failed,
        conflicts: result.conflicts.length,
      })

      // Enrich conflict items with human-readable names from the loaded data
      const enriched: SyncConflict[] = result.conflicts.map((item) => {
        const op = item.entry.op
        const bedId = op.bedId
        const stageId = op.type === 'stage-update' ? op.stageId : ''
        const bed = data.beds.find((b) => b.id === bedId)
        const attempted = data.stages.find((s) => s.id === stageId)
        const server = data.stages.find((s) => s.id === item.conflict.serverStageId)
        return {
          entryId: item.entry.id,
          bedId,
          bedNumber: bed?.bedNumber ?? bedId,
          attemptedStageId: stageId,
          attemptedStageName: attempted?.name ?? stageId,
          serverStageName: server?.name ?? item.conflict.serverStageId,
        }
      })
      // Always replace conflict state so stale conflict modals do not persist
      // after a later successful sync run.
      setSyncConflicts(enriched)
    },
    [data.beds, data.stages]
  )

  const handleKeepServer = useCallback((entryId: string) => {
    setSyncConflicts((prev) => prev.filter((c) => c.entryId !== entryId))
  }, [])

  const handleForceApply = useCallback(
    async (entryId: string) => {
      const conflict = syncConflicts.find((c) => c.entryId === entryId)
      if (!conflict) return
      setIsApplyingConflict(true)
      try {
        await fetch('/api/offline-sync/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'stage-update',
            bedId: conflict.bedId,
            stageId: conflict.attemptedStageId,
            options: {
              supervisorOverride: true,
              overrideReason: 'Force applied after offline sync conflict',
            },
          }),
          cache: 'no-store',
        })
      } finally {
        setIsApplyingConflict(false)
        setSyncConflicts((prev) => prev.filter((c) => c.entryId !== entryId))
      }
    },
    [syncConflicts]
  )

  const clearConflicts = useCallback(() => setSyncConflicts([]), [])

  return {
    syncResult,
    syncConflicts,
    isApplyingConflict,
    handleSyncComplete,
    handleKeepServer,
    handleForceApply,
    clearConflicts,
  }
}
