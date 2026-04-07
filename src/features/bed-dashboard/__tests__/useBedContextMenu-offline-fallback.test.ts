import { describe, it, expect, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useBedContextMenu } from '../hooks/useBedContextMenu'
import type { BedWithElapsedTime, StageTransitionMap } from '../types/bed'

const { getValidTransitionsForBedMock } = vi.hoisted(() => ({
  getValidTransitionsForBedMock: vi.fn(),
}))

vi.mock('../actions/bed-transition-actions', () => ({
  getValidTransitionsForBed: getValidTransitionsForBedMock,
}))

const BED: BedWithElapsedTime = {
  id: 'bed-1',
  bedNumber: 'A-01',
  wardId: 'ward-1',
  currentStageId: 'stage-triage',
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
}

describe('useBedContextMenu offline cache behavior', () => {
  it('keeps menu operable without error when transition map is missing offline', async () => {
    const onStageSelect = vi.fn()
    const { result } = renderHook(() => useBedContextMenu([BED], onStageSelect, true, undefined))

    await act(async () => {
      await result.current.handleBedTap(BED)
    })

    expect(result.current.menuError).toBeNull()
    expect(result.current.menuState?.bedId).toBe(BED.id)
    expect(result.current.validNextStages).toEqual([])
    expect(result.current.overrideRequiredStages).toEqual([])
  })

  it('uses cached transition map when available', async () => {
    getValidTransitionsForBedMock.mockReset()
    const onStageSelect = vi.fn()
    const stageTransitionMap: StageTransitionMap = {
      'stage-triage': {
        allowed: ['stage-assessment'],
        requiresOverride: ['stage-hold'],
      },
    }

    const { result } = renderHook(() => useBedContextMenu([BED], onStageSelect, true, stageTransitionMap))

    await act(async () => {
      await result.current.handleBedTap(BED)
    })

    expect(result.current.validNextStages).toEqual(['stage-assessment'])
    expect(result.current.overrideRequiredStages).toEqual(['stage-hold'])
  })

  it('uses cached transition map instantly while online (no server call)', async () => {
    getValidTransitionsForBedMock.mockReset()
    const onStageSelect = vi.fn()
    const stageTransitionMap: StageTransitionMap = {
      'stage-triage': {
        allowed: ['stage-assessment'],
        requiresOverride: ['stage-hold'],
      },
    }

    const { result } = renderHook(() => useBedContextMenu([BED], onStageSelect, false, stageTransitionMap))

    await act(async () => {
      await result.current.handleBedTap(BED)
    })

    expect(result.current.menuError).toBeNull()
    expect(result.current.validNextStages).toEqual(['stage-assessment'])
    expect(result.current.overrideRequiredStages).toEqual(['stage-hold'])
    expect(getValidTransitionsForBedMock).not.toHaveBeenCalled()
  })
})
