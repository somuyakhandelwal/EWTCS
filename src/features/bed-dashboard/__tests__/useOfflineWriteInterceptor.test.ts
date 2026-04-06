import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useOfflineWriteInterceptor } from '../hooks/useOfflineWriteInterceptor'
import type { UseOfflineQueueReturn } from '../hooks/useOfflineQueue'

vi.mock('../actions/bed-actions', () => ({
  updateBedStage: vi.fn(async () => ({ success: true })),
}))

vi.mock('../actions/discharge-actions', () => ({
  dischargeAndResetBed: vi.fn(async () => ({ success: true })),
}))

vi.mock('../actions/disposition-actions', () => ({
  recordDispositionDelayReason: vi.fn(async () => ({ success: true })),
}))

describe('useOfflineWriteInterceptor', () => {
  it('auto-drains persisted queue on mount when online', async () => {
    const drainQueue = vi.fn(async () => ({
      succeeded: 1,
      failed: 0,
      errors: [],
      conflicts: [],
    }))

    const offlineQueue = {
      pendingCount: 1,
      isDraining: false,
      drainErrors: [],
      queuedBedIds: new Set<string>(),
      enqueue: vi.fn(),
      drainQueue,
      clearQueue: vi.fn(),
    } satisfies UseOfflineQueueReturn

    const realtimeRefresh = vi.fn(async () => {})

    renderHook(() =>
      useOfflineWriteInterceptor({
        isOffline: false,
        offlineQueue,
        realtimeRefresh,
        originalHandleStageSelect: vi.fn(async () => {}),
        originalHandleOverrideApprove: vi.fn(async () => {}),
        originalHandleConfirmationConfirm: vi.fn(async () => {}),
        originalHandleDischargeConfirm: vi.fn(async () => {}),
        originalHandleReasonSelect: vi.fn(async () => {}),
        originalOnCreateVirtualBed: vi.fn(async () => ({ success: true })),
        overrideState: null,
        confirmationState: null,
        dischargeState: null,
        closeOverrideModal: vi.fn(),
        closeConfirmationModal: vi.fn(),
        closeDischargeModal: vi.fn(),
      })
    )

    await waitFor(() => {
      expect(drainQueue).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(realtimeRefresh).toHaveBeenCalledTimes(1)
    })
  })

  it('queues multiple rapid offline stage updates without dropping any', async () => {
    const enqueue = vi.fn()
    const drainQueue = vi.fn(async () => ({
      succeeded: 0,
      failed: 0,
      errors: [],
      conflicts: [],
    }))

    const offlineQueue = {
      pendingCount: 0,
      isDraining: false,
      drainErrors: [],
      queuedBedIds: new Set<string>(),
      enqueue,
      drainQueue,
      clearQueue: vi.fn(),
    } satisfies UseOfflineQueueReturn

    const originalHandleStageSelect = vi.fn(async () => {})

    const { result } = renderHook(() =>
      useOfflineWriteInterceptor({
        isOffline: true,
        offlineQueue,
        realtimeRefresh: vi.fn(async () => {}),
        originalHandleStageSelect,
        originalHandleOverrideApprove: vi.fn(async () => {}),
        originalHandleConfirmationConfirm: vi.fn(async () => {}),
        originalHandleDischargeConfirm: vi.fn(async () => {}),
        originalHandleReasonSelect: vi.fn(async () => {}),
        originalOnCreateVirtualBed: vi.fn(async () => ({ success: true })),
        overrideState: null,
        confirmationState: null,
        dischargeState: null,
        closeOverrideModal: vi.fn(),
        closeConfirmationModal: vi.fn(),
        closeDischargeModal: vi.fn(),
      })
    )

    await result.current.handleStageSelect('bed-1', 'stage-a', 'stage-start')
    await result.current.handleStageSelect('bed-1', 'stage-b', 'stage-a')
    await result.current.handleStageSelect('bed-2', 'stage-c', 'stage-start')

    expect(originalHandleStageSelect).not.toHaveBeenCalled()
    expect(enqueue).toHaveBeenCalledTimes(3)
    expect(enqueue).toHaveBeenNthCalledWith(1, {
      type: 'stage-update',
      bedId: 'bed-1',
      stageId: 'stage-a',
      expectedStageId: 'stage-start',
    })
    expect(enqueue).toHaveBeenNthCalledWith(2, {
      type: 'stage-update',
      bedId: 'bed-1',
      stageId: 'stage-b',
      expectedStageId: 'stage-a',
    })
    expect(enqueue).toHaveBeenNthCalledWith(3, {
      type: 'stage-update',
      bedId: 'bed-2',
      stageId: 'stage-c',
      expectedStageId: 'stage-start',
    })
  })
})
