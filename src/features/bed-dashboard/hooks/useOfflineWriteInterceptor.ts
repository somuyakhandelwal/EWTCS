'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { DispositionDelayReason, OverrideState, ConfirmationState, DischargeState } from '../types/bed'
import type { UseOfflineQueueReturn, DrainResult } from '../lib/offline-queue-types'
import { runOfflineDrain } from './offline-write-drain'

interface OfflineInterceptorParams {
  isOffline: boolean
  offlineQueue: UseOfflineQueueReturn
  realtimeRefresh: () => Promise<void>
  originalHandleStageSelect: (bedId: string, stageId: string) => Promise<void>
  originalHandleOverrideApprove: (reason: string) => Promise<void>
  originalHandleConfirmationConfirm: () => Promise<void>
  originalHandleDischargeConfirm: () => Promise<void>
  originalHandleReasonSelect: (bedId: string, reason: DispositionDelayReason) => Promise<void>
  originalOnCreateVirtualBed: (fd: FormData) => Promise<{ success: boolean; error?: string }>
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
  handleStageSelect: (bedId: string, stageId: string, expectedStageId?: string) => Promise<void>
  handleOverrideApprove: (reason: string) => Promise<void>
  handleConfirmationConfirm: () => Promise<void>
  handleDischargeConfirm: () => Promise<void>
  handleReasonSelect: (bedId: string, reason: DispositionDelayReason) => Promise<void>
  onCreateVirtualBed: (fd: FormData) => Promise<{ success: boolean; error?: string }>
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
  const { enqueue, drainQueue, pendingCount, isDraining } = offlineQueue
  const prevIsOfflineRef = useRef(isOffline)

  const runDrain = useCallback(() => {
    void runOfflineDrain({
      drainQueue,
      realtimeRefresh,
      onSyncComplete,
    })
  }, [drainQueue, realtimeRefresh, onSyncComplete])

  useEffect(() => {
    const wasOffline = prevIsOfflineRef.current
    prevIsOfflineRef.current = isOffline
    if (wasOffline && !isOffline) runDrain()
  }, [isOffline, runDrain])

  const lastAutoDrainPendingCountRef = useRef(0)
  useEffect(() => {
    if (isOffline || isDraining || pendingCount === 0) {
      if (pendingCount === 0) {
        lastAutoDrainPendingCountRef.current = 0
      }
      return
    }

    if (lastAutoDrainPendingCountRef.current === pendingCount) {
      return
    }

    lastAutoDrainPendingCountRef.current = pendingCount
    runDrain()
  }, [isOffline, isDraining, pendingCount, runDrain])

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
