/**
 * useOfflineOptimisticStages.test.ts
 * US-16.2: Optimistic stage overlay while writes are queued offline.
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOfflineOptimisticStages } from '../hooks/useOfflineOptimisticStages'
import type { BedGridData } from '../types/bed'

// Minimal fixture data -------------------------------------------------------

const STAGE_A = { id: 'stage-a', name: 'Initial Investigation', colorCode: '#ff0000', displayOrder: 1, description: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }
const STAGE_B = { id: 'stage-b', name: 'Treatment', colorCode: '#00ff00', displayOrder: 2, description: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }

const BED_1 = {
  id: 'bed-1',
  bedNumber: 'B01',
  wardId: 'ward-1',
  wardName: 'Ward 1',
  currentStageId: 'stage-a',
  currentStage: STAGE_A,
  isOccupied: true,
  isDelayed: false,
  isEscalated: false,
  isDispositionBottleneck: false,
  elapsedTimeMs: 5000,
  lastStageChange: new Date(),
  patientStartTime: new Date(),
  pendingAiSummary: false,
  isVirtual: false,
  isTemporary: false,
} as unknown as BedGridData['beds'][0]

const makeData = (): BedGridData => ({
  beds: [BED_1],
  stages: [STAGE_A, STAGE_B],
  delayThresholdMs: 30000,
  escalationThresholdMs: 60000,
  bottleneckCount: 0,
  escalationCount: 0,
  stageTransitionMap: {},
})

// Tests -----------------------------------------------------------------------

describe('useOfflineOptimisticStages', () => {
  it('returns the original data when no optimistic updates are pending', () => {
    const data = makeData()
    const handleStageSelect = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useOfflineOptimisticStages({ data, isOffline: true, pendingCount: 0, handleStageSelect })
    )

    expect(result.current.displayData).toBe(data) // same reference — no overlay applied
  })

  it('applies an optimistic stage change on the correct bed when offline', async () => {
    const data = makeData()
    const handleStageSelect = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useOfflineOptimisticStages({ data, isOffline: true, pendingCount: 1, handleStageSelect })
    )

    await act(async () => {
      await result.current.handleStageSelectOptimistic('bed-1', 'stage-b')
    })

    const overriddenBed = result.current.displayData.beds.find((b) => b.id === 'bed-1')
    expect(overriddenBed?.currentStageId).toBe('stage-b')
    expect(overriddenBed?.currentStage?.name).toBe('Treatment')
    expect(overriddenBed?.elapsedTimeMs).toBe(0)
    expect(overriddenBed?.isDelayed).toBe(false)
  })

  it('delegates to handleStageSelect regardless of online/offline state', async () => {
    const data = makeData()
    const handleStageSelect = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useOfflineOptimisticStages({ data, isOffline: true, pendingCount: 1, handleStageSelect })
    )

    await act(async () => {
      await result.current.handleStageSelectOptimistic('bed-1', 'stage-b')
    })

    expect(handleStageSelect).toHaveBeenCalledWith('bed-1', 'stage-b', 'stage-a')
  })

  it('does NOT apply optimistic update when online', async () => {
    const data = makeData()
    const handleStageSelect = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useOfflineOptimisticStages({ data, isOffline: false, pendingCount: 0, handleStageSelect })
    )

    await act(async () => {
      await result.current.handleStageSelectOptimistic('bed-1', 'stage-b')
    })

    // displayData must still equal the original (no overlay)
    expect(result.current.displayData).toBe(data)
  })

  it('clears the optimistic overlay once back online with empty queue', async () => {
    const data = makeData()
    const handleStageSelect = vi.fn().mockResolvedValue(undefined)

    const { result, rerender } = renderHook(
      ({ isOffline, pendingCount }: { isOffline: boolean; pendingCount: number }) =>
        useOfflineOptimisticStages({ data, isOffline, pendingCount, handleStageSelect }),
      { initialProps: { isOffline: true, pendingCount: 1 } }
    )

    // Queue the update while offline
    await act(async () => {
      await result.current.handleStageSelectOptimistic('bed-1', 'stage-b')
    })

    expect(result.current.displayData.beds[0].currentStageId).toBe('stage-b')

    // Simulate coming back online with queue drained
    rerender({ isOffline: false, pendingCount: 0 })

    // Overlay should be cleared → original data is shown
    expect(result.current.displayData).toBe(data)
  })

  it('does not clear overlay while still offline even if pendingCount drops', async () => {
    const data = makeData()
    const handleStageSelect = vi.fn().mockResolvedValue(undefined)

    const { result, rerender } = renderHook(
      ({ isOffline, pendingCount }: { isOffline: boolean; pendingCount: number }) =>
        useOfflineOptimisticStages({ data, isOffline, pendingCount, handleStageSelect }),
      { initialProps: { isOffline: true, pendingCount: 1 } }
    )

    await act(async () => {
      await result.current.handleStageSelectOptimistic('bed-1', 'stage-b')
    })

    // pendingCount drops but still offline — overlay must remain
    rerender({ isOffline: true, pendingCount: 0 })
    expect(result.current.displayData.beds[0].currentStageId).toBe('stage-b')
  })

  it('returns original bed unchanged if stageId maps to unknown stage', async () => {
    const data = makeData()
    const handleStageSelect = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useOfflineOptimisticStages({ data, isOffline: true, pendingCount: 1, handleStageSelect })
    )

    await act(async () => {
      await result.current.handleStageSelectOptimistic('bed-1', 'stage-unknown')
    })

    // Stage not found in data.stages → bed unchanged
    const bed = result.current.displayData.beds[0]
    expect(bed.currentStageId).toBe('stage-a')
  })
})
