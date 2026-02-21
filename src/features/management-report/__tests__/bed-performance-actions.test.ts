// Tests for US-10.4 — Bed-Wise Performance
// Verifies fetchBedPerformanceReport server action behaviour.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('../lib/bed-performance-queries', () => ({
  getBedPerformanceReport: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import { getBedPerformanceReport } from '../lib/bed-performance-queries'
import { fetchBedPerformanceReport } from '../actions/bed-performance-actions'
import type { BedPerformanceReport } from '../types/report.types'

const START = new Date('2026-02-13T00:00:00.000Z')
const END = new Date('2026-02-20T23:59:59.000Z')

const MOCK_REPORT: BedPerformanceReport = {
  rows: [
    {
      bedId: 'bed-1',
      bedNumber: 'ER-01',
      patientsTreated: 15,
      avgDurationMs: 7200000,
      minDurationMs: 1800000,
      maxDurationMs: 18000000,
      delayedCount: 2,
      delayRate: 13.3,
      isOutlier: false,
    },
    {
      bedId: 'bed-2',
      bedNumber: 'ER-02',
      patientsTreated: 8,
      avgDurationMs: 18000000,
      minDurationMs: 10800000,
      maxDurationMs: 36000000,
      delayedCount: 6,
      delayRate: 75.0,
      isOutlier: true,
    },
  ],
  overallAvgMs: 10800000,
  thresholdMs: 10800000,
  rangeStart: START,
  rangeEnd: END,
}

describe('fetchBedPerformanceReport', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns report for all beds', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getBedPerformanceReport).mockResolvedValue(MOCK_REPORT)

    const result = await fetchBedPerformanceReport({ startDate: START, endDate: END })

    expect(requireRole).toHaveBeenCalledWith(['supervisor', 'admin', 'auditor'])
    expect(result.success).toBe(true)
    expect(result.data?.rows).toHaveLength(2)
    expect(result.data?.rows[1].isOutlier).toBe(true)
  })

  it('logs outlier count', async () => {
    const { logger } = await import('@/shared/config/logger')
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'supervisor' } as never)
    vi.mocked(getBedPerformanceReport).mockResolvedValue(MOCK_REPORT)

    await fetchBedPerformanceReport({ startDate: START, endDate: END })

    expect(logger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ outliers: 1 })
    )
  })

  it('passes shiftId to query', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getBedPerformanceReport).mockResolvedValue(MOCK_REPORT)

    const shiftId = 'morning-shift-uuid'
    await fetchBedPerformanceReport({ startDate: START, endDate: END, shiftId })

    expect(getBedPerformanceReport).toHaveBeenCalledWith(START, END, shiftId)
  })

  it('accepts ISO date strings', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'auditor' } as never)
    vi.mocked(getBedPerformanceReport).mockResolvedValue(MOCK_REPORT)

    const result = await fetchBedPerformanceReport({
      startDate: START.toISOString(),
      endDate: END.toISOString(),
    })
    expect(result.success).toBe(true)
  })

  it('rejects when start > end', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)

    const result = await fetchBedPerformanceReport({ startDate: END, endDate: START })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/before/i)
  })

  it('rejects invalid dates', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)

    const result = await fetchBedPerformanceReport({
      startDate: 'bad-date',
      endDate: END,
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/invalid/i)
  })

  it('handles query errors gracefully', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getBedPerformanceReport).mockRejectedValue(new Error('Connection timeout'))

    const result = await fetchBedPerformanceReport({ startDate: START, endDate: END })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Connection timeout')
  })
})
