// useOfflineWriteInterceptor
// US-16.1 + US-16.2: Intercepts write operations when the browser is offline.
//
// When offline:
//   - Stage updates, supervisor overrides, confirmation, discharge and
//     disposition-reason operations are queued in useOfflineQueue (localStorage).
//   - Virtual bed creation is blocked with an error message (FormData can't be serialised).
//   - On network restore the queue is drained automatically (FIFO) using server actions directly.
//
// When online: all handlers delegate to the original callbacks unchanged.

'use client'

import { useCallback, useEffect, useRef } from 'react'
import { updateBedStage } from '../actions/bed-actions'
import { dischargeAndResetBed } from '../actions/discharge-actions'
import { recordDispositionDelayReason } from '../actions/disposition-actions'
import type { DispositionDelayReason, OverrideState, ConfirmationState, DischargeState } from '../types/bed'
import type { UseOfflineQueueReturn, DrainResult } from './useOfflineQueue'

interface OfflineInterceptorParams {
  isOffline: boolean
  offlineQueue: UseOfflineQueueReturn
  realtimeRefresh: () => Promise<void>
  // Original write handlers
  originalHandleStageSelect: (bedId: string, stageId: string) => Promise<void>
  originalHandleOverrideApprove: (reason: string) => Promise<void>
  originalHandleConfirmationConfirm: () => Promise<void>
  originalHandleDischargeConfirm: () => Promise<void>
  originalHandleReasonSelect: (bedId: string, reason: DispositionDelayReason) => Promise<void>
  originalOnCreateVirtualBed: (fd: FormData) => Promise<{ success: boolean; error?: string }>
  // Modal state refs (to close modals when intercepting while they're open)
  overrideState: OverrideState | null
  confirmationState: ConfirmationState | null
  dischargeState: DischargeState | null
  closeOverrideModal: () => void
  closeConfirmationModal: () => void
  closeDischargeModal: () => void
  /** US-16.3: called after each drain completes with the full result */
  onSyncComplete?: (result: DrainResult) => void
}

interface OfflineInterceptorReturn {
  /** US-16.4: accepts optional expectedStageId for conflict detection during offline drain */
  handleStageSelect: (bedId: string, stageId: string, expectedStageId?: string) => Promise<void>
  handleOverrideApprove: (reason: string) => Promise<void>
  handleConfirmationConfirm: () => Promise<void>
  handleDischargeConfirm: () => Promise<void>
  handleReasonSelect: (bedId: string, reason: DispositionDelayReason) => Promise<void>
  onCreateVirtualBed: (fd: FormData) => Promise<{ success: boolean; error?: string }>
  /** US-16.3: manually re-trigger the drain (used by the Retry button) */
  retryDrain: () => void
}

export function useOfflineWriteInterceptor({
  isOffline,
  offlineQueue,
  realtimeRefresh,
  originalHandleStageSelect,
  originalHandleOverrideApprove,
  originalHandleConfirmationConfirm,
  originalHandleDischargeConfirm,
  originalHandleReasonSelect,
  originalOnCreateVirtualBed,
  overrideState,
  confirmationState,
  dischargeState,
  closeOverrideModal,
  closeConfirmationModal,
  closeDischargeModal,
  onSyncComplete,
}: OfflineInterceptorParams): OfflineInterceptorReturn {
  const { enqueue, drainQueue } = offlineQueue

  // ── Auto-drain on network restore ──────────────────────────────────────
  const prevIsOfflineRef = useRef(isOffline)

  const runDrain = useCallback(() => {
    drainQueue({
      onStageUpdate: async (bedId, stageId, options, expectedStageId) => {
        const result = await updateBedStage({
          bedId,
          toStageId: stageId,
          supervisorOverride: options?.supervisorOverride ?? false,
          overrideReason: options?.overrideReason,
          expectedStageId,
        })
        if (result.conflict && result.serverStageId !== undefined) {
          return { success: false, conflict: { serverStageId: result.serverStageId ?? '' } }
        }
        return { success: result.success }
      },
      onDischarge: async (bedId) => {
        const result = await dischargeAndResetBed({ bedId })
        return result.success
      },
      onDispositionReason: async (bedId, reason) => {
        const result = await recordDispositionDelayReason({ bedId, reason })
        return result.success
      },
    }).then((drainResult) => {
      realtimeRefresh()
      onSyncComplete?.(drainResult)
    }).catch(() => {})
  }, [drainQueue, realtimeRefresh, onSyncComplete])

  useEffect(() => {
    const wasOffline = prevIsOfflineRef.current
    prevIsOfflineRef.current = isOffline
    if (wasOffline && !isOffline) runDrain()
  }, [isOffline, runDrain])

  // ── Intercepted write handlers ─────────────────────────────────────────

  const handleStageSelect = useCallback(
    async (bedId: string, stageId: string, expectedStageId?: string) => {
      if (isOffline) {
        enqueue({ type: 'stage-update', bedId, stageId, expectedStageId })
        return
      }
      await originalHandleStageSelect(bedId, stageId)
    },
    [isOffline, enqueue, originalHandleStageSelect]
  )

  const handleOverrideApprove = useCallback(
    async (reason: string) => {
      if (isOffline && overrideState) {
        enqueue({
          type: 'stage-update',
          bedId: overrideState.bedId,
          stageId: overrideState.stageId,
          options: { supervisorOverride: true, overrideReason: reason },
        })
        closeOverrideModal()
        return
      }
      await originalHandleOverrideApprove(reason)
    },
    [isOffline, enqueue, overrideState, closeOverrideModal, originalHandleOverrideApprove]
  )

  const handleConfirmationConfirm = useCallback(async () => {
    if (isOffline && confirmationState) {
      enqueue({ type: 'stage-update', bedId: confirmationState.bedId, stageId: confirmationState.stageId })
      closeConfirmationModal()
      return
    }
    await originalHandleConfirmationConfirm()
  }, [isOffline, enqueue, confirmationState, closeConfirmationModal, originalHandleConfirmationConfirm])

  const handleDischargeConfirm = useCallback(async () => {
    if (isOffline && dischargeState) {
      enqueue({ type: 'discharge', bedId: dischargeState.bedId })
      closeDischargeModal()
      return
    }
    await originalHandleDischargeConfirm()
  }, [isOffline, enqueue, dischargeState, closeDischargeModal, originalHandleDischargeConfirm])

  const handleReasonSelect = useCallback(
    async (bedId: string, reason: DispositionDelayReason) => {
      if (isOffline) {
        enqueue({ type: 'disposition-reason', bedId, reason })
        return
      }
      await originalHandleReasonSelect(bedId, reason)
    },
    [isOffline, enqueue, originalHandleReasonSelect]
  )

  // Virtual bed creation cannot be serialised to localStorage (FormData)
  const onCreateVirtualBed = useCallback(
    async (fd: FormData) => {
      if (isOffline) {
        return { success: false, error: 'Cannot add virtual beds while offline. Please reconnect and try again.' }
      }
      return originalOnCreateVirtualBed(fd)
    },
    [isOffline, originalOnCreateVirtualBed]
  )

  return {
    handleStageSelect,
    handleOverrideApprove,
    handleConfirmationConfirm,
    handleDischargeConfirm,
    handleReasonSelect,
    onCreateVirtualBed,
    retryDrain: runDrain,
  }
}
