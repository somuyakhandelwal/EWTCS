import { describe, expect, it, vi } from 'vitest'
import { executeStageUpdate } from '../lib/execute-stage-update'
import { updateBedStage } from '../actions/bed-actions'
import type { BedGridData, BedWithElapsedTime, Stage } from '../types/bed'

vi.mock('../actions/bed-actions', () => ({
  updateBedStage: vi.fn(),
}))

function makeStage(overrides: Partial<Stage> = {}): Stage {
  return {
    id: 'stage-2',
    name: 'Assessment',
    displayOrder: 2,
    colorCode: 'blue',
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeBed(overrides: Partial<BedWithElapsedTime> = {}): BedWithElapsedTime {
  const stage = makeStage({ id: 'stage-1', name: 'Triage' })
  return {
    id: 'bed-1',
    bedNumber: 'EW-01',
    currentStageId: stage.id,
    currentStage: stage,
    patientStartTime: new Date(),
    lastStageChange: new Date(),
    isOccupied: true,
    isActive: true,
    isTemporary: false,
    isVirtual: false,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    elapsedTimeMs: 0,
    isDelayed: false,
    isDispositionBottleneck: false,
    dispositionElapsedMs: null,
    dispositionDelayReason: null,
    dispositionDelayLogId: null,
    ...overrides,
  }
}

function buildArgs() {
  const nextStage = makeStage()
  const data: BedGridData = {
    beds: [makeBed()],
    stages: [nextStage],
    delayThresholdMs: 1000,
    bottleneckCount: 0,
  }
  let currentData = data

  return {
    args: {
      bedId: 'bed-1',
      stageId: nextStage.id,
      data,
      stageById: new Map([[nextStage.id, nextStage]]),
      updatingBedId: null,
      setUpdatingBedId: vi.fn(),
      setUpdatingStageId: vi.fn(),
      setData: vi.fn((update: BedGridData | ((prev: BedGridData) => BedGridData)) => {
        currentData = typeof update === 'function' ? update(currentData) : update
      }),
      setTemporaryError: vi.fn(),
      clearError: vi.fn(),
      showSuccessFeedback: vi.fn(),
      openOverrideModal: vi.fn(),
      routerRefresh: vi.fn(),
      updateTimeoutTimer: { current: null } as { current: NodeJS.Timeout | null },
      isUpdateTimedOut: { current: false } as { current: boolean },
    },
  }
}

describe('executeStageUpdate reliability', () => {
  it('saves stage update immediately and returns success', async () => {
    vi.mocked(updateBedStage).mockResolvedValue({
      success: true,
      data: {
        bedId: 'bed-1',
        fromStageId: 'stage-1',
        toStageId: 'stage-2',
        durationInPreviousStageMs: 1000,
        isOccupied: true,
        patientStartTime: new Date(),
        lastStageChange: new Date(),
      },
    })

    const { args } = buildArgs()
    const result = await executeStageUpdate(args)

    expect(result).toBe(true)
    expect(updateBedStage).toHaveBeenCalledTimes(1)
    expect(args.showSuccessFeedback).toHaveBeenCalledWith('bed-1', 'stage-2')
    expect(args.routerRefresh).toHaveBeenCalled()
  })

  it('retries failed saves and alerts after retries are exhausted', async () => {
    vi.mocked(updateBedStage).mockResolvedValue({ success: false, error: 'Save failed' })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined)

    const { args } = buildArgs()
    const result = await executeStageUpdate(args)

    expect(result).toBe(false)
    expect(updateBedStage).toHaveBeenCalledTimes(3)
    expect(args.setTemporaryError).toHaveBeenCalledWith('bed-1', 'Save failed')
    expect(alertSpy).toHaveBeenCalledWith('Stage update failed after retries. Please try again.')
  })

  it('does not retry or alert on non-transient validation errors', async () => {
    vi.mocked(updateBedStage).mockResolvedValue({
      success: false,
      error: 'Invalid stage transition',
      reason: 'Invalid stage transition',
    })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined)

    const { args } = buildArgs()
    const result = await executeStageUpdate(args)

    expect(result).toBe(false)
    expect(updateBedStage).toHaveBeenCalledTimes(1)
    expect(args.setTemporaryError).toHaveBeenCalledWith('bed-1', 'Invalid stage transition')
    expect(alertSpy).not.toHaveBeenCalled()
  })
})
