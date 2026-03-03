/**
 * useOfflineQueue-enqueue.test.ts
 * US-16.1 + US-16.2: Tests for queue enqueue, FIFO ordering, and localStorage persistence.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOfflineQueue } from '../hooks/useOfflineQueue'

const QUEUE_KEY = 'ewtcs_offline_queue'

describe('useOfflineQueue — enqueue', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with an empty queue', () => {
    const { result } = renderHook(() => useOfflineQueue())
    expect(result.current.pendingCount).toBe(0)
  })

  it('increments pendingCount after enqueue', () => {
    const { result } = renderHook(() => useOfflineQueue())

    act(() => {
      result.current.enqueue({ type: 'stage-update', bedId: 'bed-1', stageId: 'stage-2' })
    })

    expect(result.current.pendingCount).toBe(1)
  })

  it('persists queue entries to localStorage', () => {
    const { result } = renderHook(() => useOfflineQueue())

    act(() => {
      result.current.enqueue({ type: 'discharge', bedId: 'bed-3' })
    })

    const stored = JSON.parse(localStorage.getItem(QUEUE_KEY)!)
    expect(stored).toHaveLength(1)
    expect(stored[0].op.type).toBe('discharge')
    expect(stored[0].op.bedId).toBe('bed-3')
  })

  it('appends multiple operations in FIFO order', () => {
    const { result } = renderHook(() => useOfflineQueue())

    act(() => {
      result.current.enqueue({ type: 'stage-update', bedId: 'bed-1', stageId: 'stage-a' })
      result.current.enqueue({ type: 'disposition-reason', bedId: 'bed-2', reason: 'no_icu_bed' })
    })

    expect(result.current.pendingCount).toBe(2)

    const stored = JSON.parse(localStorage.getItem(QUEUE_KEY)!)
    expect(stored[0].op.type).toBe('stage-update')
    expect(stored[1].op.type).toBe('disposition-reason')
  })

  it('hydrates from localStorage on mount', () => {
    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify([{ id: 'oq-seed', enqueuedAt: new Date().toISOString(), op: { type: 'discharge', bedId: 'bed-x' } }])
    )

    const { result } = renderHook(() => useOfflineQueue())
    expect(result.current.pendingCount).toBe(1)
  })

  it('exposes queuedBedIds derived from queued operations', () => {
    const { result } = renderHook(() => useOfflineQueue())

    act(() => {
      result.current.enqueue({ type: 'stage-update', bedId: 'bed-A', stageId: 's1' })
      result.current.enqueue({ type: 'discharge', bedId: 'bed-B' })
    })

    expect(result.current.queuedBedIds.has('bed-A')).toBe(true)
    expect(result.current.queuedBedIds.has('bed-B')).toBe(true)
    expect(result.current.queuedBedIds.has('bed-C')).toBe(false)
  })
})
