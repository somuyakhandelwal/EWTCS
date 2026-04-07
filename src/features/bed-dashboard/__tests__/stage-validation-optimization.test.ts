import { beforeEach, describe, expect, it, vi } from 'vitest'

const { dbQueryMock } = vi.hoisted(() => ({
  dbQueryMock: vi.fn(),
}))

vi.mock('@/shared/lib/db', () => ({
  __esModule: true,
  default: { query: dbQueryMock },
  query: dbQueryMock,
}))

vi.mock('@/shared/config/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { categorizeStagesForTransition } from '../lib/stage-validation'

describe('stage-validation optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validating 10 stages for nurse uses 1 DB query (single transition-map batch)', async () => {
    const fromStageId = 'from-stage'
    const allStageIds = Array.from({ length: 10 }, (_, i) => `to-${i + 1}`)

    dbQueryMock.mockResolvedValueOnce({
      rows: [
        {
          fromStageId,
          toStageId: 'to-1',
          isAllowed: true,
          requiresSupervisorOverride: false,
        },
        {
          fromStageId,
          toStageId: 'to-2',
          isAllowed: false,
          requiresSupervisorOverride: true,
        },
        {
          fromStageId,
          toStageId: 'to-3',
          isAllowed: false,
          requiresSupervisorOverride: false,
        },
      ],
    })

    const categorized = await categorizeStagesForTransition(fromStageId, allStageIds, 'nurse')

    expect(dbQueryMock).toHaveBeenCalledTimes(1)
    expect(categorized.allowed).toEqual(['to-1', 'to-4', 'to-5', 'to-6', 'to-7', 'to-8', 'to-9', 'to-10'])
    expect(categorized.requiresOverride).toEqual([])
    expect(categorized.invalid).toEqual(['to-2', 'to-3'])
  })

  it('housekeeping categorization for 10 stages uses 1 DB query (single names batch)', async () => {
    const fromStageId = 'stage-discharge'
    const cleaningStageId = 'stage-cleaning'
    const emptyStageId = 'stage-empty'
    const allStageIds = [
      cleaningStageId,
      emptyStageId,
      ...Array.from({ length: 8 }, (_, i) => `stage-other-${i + 1}`),
    ]

    dbQueryMock.mockResolvedValueOnce({
      rows: [
        { id: fromStageId, name: 'Discharge Process' },
        { id: cleaningStageId, name: 'Cleaning' },
        { id: emptyStageId, name: 'Empty' },
        ...Array.from({ length: 8 }, (_, i) => ({ id: `stage-other-${i + 1}`, name: `Other ${i + 1}` })),
      ],
    })

    const categorized = await categorizeStagesForTransition(fromStageId, allStageIds, 'housekeeping')

    expect(dbQueryMock).toHaveBeenCalledTimes(1)
    expect(categorized.allowed).toEqual([cleaningStageId])
    expect(categorized.requiresOverride).toEqual([])
    expect(categorized.invalid).toHaveLength(9)
  })
})
