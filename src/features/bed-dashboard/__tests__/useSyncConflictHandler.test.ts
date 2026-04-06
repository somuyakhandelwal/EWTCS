import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSyncConflictHandler } from '../hooks/useSyncConflictHandler'
import type { BedGridData } from '../types/bed'

const data: BedGridData = {
  beds: [
    {
      id: 'bed-1',
      bedNumber: 'ER-01',
      wardId: 'ward-1',
      currentStageId: 'stage-a',
      currentStage: null,
      patientStartTime: null,
      lastStageChange: null,
      isOccupied: true,
      isActive: true,
      isTemporary: false,
      isVirtual: false,
      metadata: {},
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      elapsedTimeMs: 0,
      isDelayed: false,
      isEscalated: false,
      isDispositionBottleneck: false,
      dispositionElapsedMs: null,
      dispositionDelayReason: null,
      dispositionDelayLogId: null,
    },
  ],
  stages: [
    { id: 'stage-a', name: 'Registration', displayOrder: 1, colorCode: '#111111', description: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 'stage-b', name: 'Triage', displayOrder: 2, colorCode: '#222222', description: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ],
  delayThresholdMs: 1000,
  escalationThresholdMs: 2000,
  bottleneckCount: 0,
  escalationCount: 0,
}

describe('useSyncConflictHandler', () => {
  it('clears stale conflicts when next sync completes without conflicts', () => {
    const { result } = renderHook(() => useSyncConflictHandler({ data }))

    act(() => {
      result.current.handleSyncComplete({
        succeeded: 0,
        failed: 1,
        errors: ['conflict'],
        conflicts: [
          {
            entry: {
              id: 'entry-1',
              clientOperationId: 'entry-1',
              enqueuedAt: new Date().toISOString(),
              op: {
                type: 'stage-update',
                bedId: 'bed-1',
                stageId: 'stage-b',
              },
            },
            conflict: { serverStageId: 'stage-a' },
          },
        ],
      })
    })

    expect(result.current.syncConflicts).toHaveLength(1)

    act(() => {
      result.current.handleSyncComplete({
        succeeded: 2,
        failed: 0,
        errors: [],
        conflicts: [],
      })
    })

    expect(result.current.syncConflicts).toHaveLength(0)
  })
})
