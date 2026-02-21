// Tests for US-10.5 — Stage-Wise Delays
// Verifies fetchStageDelayReport server action behaviour.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('../lib/stage-delay-queries', () => ({
  getStageDelayReport: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import { getStageDelayReport } from '../lib/stage-delay-queries'
import { fetchStageDelayReport } from '../actions/stage-delay-actions'
import type { StageDelayReport } from '../types/report.types'

const START = new Date('2026-02-13T00:00:00.000Z')
const END = new Date('2026-02-20T23:59:59.000Z')

const MOCK_REPORT: StageDelayReport = {
  rows: [
    {
      stageId: 's1',
      stageName: 'Consultation',
      totalTransitions: 42,
      avgDurationMs: 5400000,
      medianDurationMs: 4800000,
      p90DurationMs: 9000000,
      isBottleneck: true,
    },
    {
      stageId: 's2',
      stageName: 'Triage',
      totalTransitions: 45,
      avgDurationMs: 900000,
      medianDurationMs: 840000,
      p90DurationMs: 1500000,
      isBottleneck: false,
    },
    {
      stageId: 's3',
      stageName: 'Cleaning',
      totalTransitions: 38,
      avgDurationMs: 1200000,
      medianDurationMs: 1100000,
      p90DurationMs: 2000000,
      isBottleneck: false,
    },
  ],
  overallMeanMs: 2500000,
  rangeStart: START,
  rangeEnd: END,
}

describe('fetchStageDelayReport', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns stage report successfully with date range', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'supervisor' } as never)
    vi.mocked(getStageDelayReport).mockResolvedValue(MOCK_REPORT)

    const result = await fetchStageDelayReport({ startDate: START, endDate: END })

    expect(requireRole).toHaveBeenCalledWith(['supervisor', 'admin', 'auditor'])
    expect(result.success).toBe(true)
    expect(result.data?.rows).toHaveLength(3)
    expect(result.data?.rows[0].isBottleneck).toBe(true)
    expect(result.data?.rows[0].stageName).toBe('Consultation')
  })

  it('returns report without date filter (all-time)', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getStageDelayReport).mockResolvedValue(MOCK_REPORT)

    const result = await fetchStageDelayReport({})

    expect(getStageDelayReport).toHaveBeenCalledWith(undefined, undefined)
    expect(result.success).toBe(true)
  })

  it('accepts ISO string dates', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'auditor' } as never)
    vi.mocked(getStageDelayReport).mockResolvedValue(MOCK_REPORT)

    const result = await fetchStageDelayReport({
      startDate: START.toISOString(),
      endDate: END.toISOString(),
    })
    expect(result.success).toBe(true)
  })

  it('rejects when start > end', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)

    const result = await fetchStageDelayReport({ startDate: END, endDate: START })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/before/i)
  })

  it('logs bottleneck count', async () => {
    const { logger } = await import('@/shared/config/logger')
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getStageDelayReport).mockResolvedValue(MOCK_REPORT)

    await fetchStageDelayReport({ startDate: START, endDate: END })

    expect(logger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ bottlenecks: 1 })
    )
  })

  it('handles query errors gracefully', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getStageDelayReport).mockRejectedValue(new Error('Query failed'))

    const result = await fetchStageDelayReport({ startDate: START, endDate: END })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Query failed')
  })

  it('identifies the correct bottleneck stages', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getStageDelayReport).mockResolvedValue(MOCK_REPORT)

    const result = await fetchStageDelayReport({ startDate: START, endDate: END })
    const bottlenecks = result.data?.rows.filter((r) => r.isBottleneck) ?? []
    const nonBottlenecks = result.data?.rows.filter((r) => !r.isBottleneck) ?? []

    expect(bottlenecks).toHaveLength(1)
    expect(bottlenecks[0].stageName).toBe('Consultation')
    expect(nonBottlenecks).toHaveLength(2)
  })
})
