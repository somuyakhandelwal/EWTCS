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

describe('useOfflineQueue — DB/local dedupe', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('drains a duplicated DB+local operation only once', async () => {
    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify([
        {
          id: 'op-1',
          clientOperationId: 'op-1',
          enqueuedAt: new Date('2026-04-04T10:00:00.000Z').toISOString(),
          op: { type: 'discharge', bedId: 'bed-77' },
        },
      ])
    )

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('/api/offline-queue?mode=pending')) {
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                id: 'db-row-1',
                client_operation_id: 'op-1',
                operation_type: 'discharge',
                payload: { type: 'discharge', bedId: 'bed-77' },
                enqueued_at: '2026-04-04T10:00:00.000Z',
                error_message: null,
              },
            ],
          }),
        } as Response
      }

      if (url.includes('/api/offline-queue') && init?.method === 'PATCH') {
        return { ok: true, json: async () => ({ success: true }) } as Response
      }

      return { ok: false, json: async () => ({}) } as Response
    })

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useOfflineQueue())
    const handlers = makeHandlers({
      onDischarge: vi.fn().mockResolvedValue(true),
    })

    await act(async () => {
      await result.current.drainQueue(handlers)
    })

    expect(handlers.onDischarge).toHaveBeenCalledTimes(1)
    expect(result.current.pendingCount).toBe(0)
  })
})
