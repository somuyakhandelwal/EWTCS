/**
 * useOfflineQueue-drain.test.ts
 * US-16.1 + US-16.2: Tests for drain (success, partial failure, thrown errors) and clearQueue.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOfflineQueue } from '../hooks/useOfflineQueue'
import type { DrainHandlers } from '../hooks/useOfflineQueue'

const QUEUE_KEY = 'ewtcs_offline_queue'

function makeHandlers(overrides: Partial<DrainHandlers> = {}): DrainHandlers {
  return {
    onStageUpdate: vi.fn().mockResolvedValue({ success: true }),
    onDischarge: vi.fn().mockResolvedValue(true),
    onDispositionReason: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

describe('useOfflineQueue — drainQueue (all succeed)', () => {
  beforeEach(() => { localStorage.clear() })

  it('calls the correct handler for each operation type', async () => {
    const { result } = renderHook(() => useOfflineQueue())
    const handlers = makeHandlers()

    act(() => {
      result.current.enqueue({ type: 'stage-update', bedId: 'b1', stageId: 's1' })
      result.current.enqueue({ type: 'discharge', bedId: 'b2' })
      result.current.enqueue({ type: 'disposition-reason', bedId: 'b3', reason: 'other' })
    })

    let drainResult
    await act(async () => {
      drainResult = await result.current.drainQueue(handlers)
    })

    expect(handlers.onStageUpdate).toHaveBeenCalledWith('b1', 's1', undefined, undefined)
    expect(handlers.onDischarge).toHaveBeenCalledWith('b2')
    expect(handlers.onDispositionReason).toHaveBeenCalledWith('b3', 'other')
    expect(drainResult!.succeeded).toBe(3)
    expect(drainResult!.failed).toBe(0)
  })

  it('clears the queue after all operations succeed', async () => {
    const { result } = renderHook(() => useOfflineQueue())

    act(() => {
      result.current.enqueue({ type: 'discharge', bedId: 'bed-4' })
    })

    await act(async () => {
      await result.current.drainQueue(makeHandlers())
    })

    expect(result.current.pendingCount).toBe(0)
    expect(localStorage.getItem(QUEUE_KEY)).toBe('[]')
  })

  it('passes supervisorOverride options to onStageUpdate', async () => {
    const { result } = renderHook(() => useOfflineQueue())
    const handlers = makeHandlers()

    act(() => {
      result.current.enqueue({
        type: 'stage-update',
        bedId: 'b1',
        stageId: 's1',
        options: { supervisorOverride: true, overrideReason: 'test-reason' },
      })
    })

    await act(async () => {
      await result.current.drainQueue(handlers)
    })

    expect(handlers.onStageUpdate).toHaveBeenCalledWith('b1', 's1', {
      supervisorOverride: true,
      overrideReason: 'test-reason',
    }, undefined)
  })
})

describe('useOfflineQueue — drainQueue (partial failure)', () => {
  beforeEach(() => { localStorage.clear() })

  it('keeps failed entries in the queue and reports errors', async () => {
    const { result } = renderHook(() => useOfflineQueue())

    act(() => {
      result.current.enqueue({ type: 'stage-update', bedId: 'b1', stageId: 's1' }) // will fail
      result.current.enqueue({ type: 'discharge', bedId: 'b2' })                   // will succeed
    })

    const handlers = makeHandlers({
      onStageUpdate: vi.fn().mockResolvedValue({ success: false }),
    })

    let drainResult
    await act(async () => {
      drainResult = await result.current.drainQueue(handlers)
    })

    expect(drainResult!.succeeded).toBe(1)
    expect(drainResult!.failed).toBe(1)
    expect(drainResult!.errors[0]).toContain('stage-update')
    expect(result.current.pendingCount).toBe(1)

    const stored = JSON.parse(localStorage.getItem(QUEUE_KEY)!)
    expect(stored[0].op.type).toBe('stage-update')
  })

  it('records thrown errors as failures', async () => {
    const { result } = renderHook(() => useOfflineQueue())

    act(() => {
      result.current.enqueue({ type: 'discharge', bedId: 'b5' })
    })

    const handlers = makeHandlers({
      onDischarge: vi.fn().mockRejectedValue(new Error('Network timeout')),
    })

    let drainResult
    await act(async () => {
      drainResult = await result.current.drainQueue(handlers)
    })

    expect(drainResult!.failed).toBe(1)
    expect(drainResult!.errors[0]).toContain('Network timeout')
    expect(result.current.pendingCount).toBe(1)
  })
})

describe('useOfflineQueue — clearQueue', () => {
  beforeEach(() => { localStorage.clear() })

  it('clears all entries from state and localStorage', () => {
    const { result } = renderHook(() => useOfflineQueue())

    act(() => {
      result.current.enqueue({ type: 'stage-update', bedId: 'b1', stageId: 's1' })
      result.current.enqueue({ type: 'discharge', bedId: 'b2' })
    })

    act(() => { result.current.clearQueue() })

    expect(result.current.pendingCount).toBe(0)
    expect(localStorage.getItem(QUEUE_KEY)).toBeNull()
  })
})
