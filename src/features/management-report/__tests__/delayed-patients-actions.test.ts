// Tests for US-10.3 — Percentage of Delayed Patients
// Verifies fetchDelayedPatientsSummary & saveDelayTargetPctAction behaviour.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('../lib/delayed-patients-queries', () => ({
  getDelayedPatientsSummary: vi.fn(),
  saveDelayTargetPct: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import {
  getDelayedPatientsSummary,
  saveDelayTargetPct,
} from '../lib/delayed-patients-queries'
import {
  fetchDelayedPatientsSummary,
  saveDelayTargetPctAction,
} from '../actions/delayed-patients-actions'
import type { DelayedPatientsSummary } from '../types/report.types'

const START = new Date('2026-02-13T00:00:00.000Z')
const END = new Date('2026-02-20T23:59:59.000Z')

const MOCK_SUMMARY: DelayedPatientsSummary = {
  totalPatients: 100,
  delayedPatients: 22,
  delayPct: 22.0,
  targetPct: 20,
  thresholdMs: 10800000,
  rangeStart: START,
  rangeEnd: END,
  trend: [
    { date: '2026-02-19', totalPatients: 14, delayedPatients: 3, delayPct: 21.4 },
    { date: '2026-02-20', totalPatients: 10, delayedPatients: 2, delayPct: 20.0 },
  ],
}

describe('fetchDelayedPatientsSummary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns summary successfully', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getDelayedPatientsSummary).mockResolvedValue(MOCK_SUMMARY)

    const result = await fetchDelayedPatientsSummary({ startDate: START, endDate: END })

    expect(requireRole).toHaveBeenCalledWith(['supervisor', 'admin', 'auditor'])
    expect(result.success).toBe(true)
    expect(result.data?.totalPatients).toBe(100)
    expect(result.data?.delayedPatients).toBe(22)
    expect(result.data?.delayPct).toBe(22.0)
  })

  it('passes shiftId when provided', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'supervisor' } as never)
    vi.mocked(getDelayedPatientsSummary).mockResolvedValue({ ...MOCK_SUMMARY, totalPatients: 30 })

    const shiftId = 'shift-uuid-morning'
    const result = await fetchDelayedPatientsSummary({ startDate: START, endDate: END, shiftId })

    expect(getDelayedPatientsSummary).toHaveBeenCalledWith(START, END, shiftId)
    expect(result.success).toBe(true)
  })

  it('accepts ISO date strings', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'auditor' } as never)
    vi.mocked(getDelayedPatientsSummary).mockResolvedValue(MOCK_SUMMARY)

    const result = await fetchDelayedPatientsSummary({
      startDate: START.toISOString(),
      endDate: END.toISOString(),
    })
    expect(result.success).toBe(true)
  })

  it('rejects when start > end', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)

    const result = await fetchDelayedPatientsSummary({ startDate: END, endDate: START })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/before/i)
  })

  it('rejects invalid dates', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)

    const result = await fetchDelayedPatientsSummary({
      startDate: 'not-a-date',
      endDate: END,
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/invalid/i)
  })

  it('handles query error gracefully', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getDelayedPatientsSummary).mockRejectedValue(new Error('DB down'))

    const result = await fetchDelayedPatientsSummary({ startDate: START, endDate: END })
    expect(result.success).toBe(false)
    expect(result.error).toBe('DB down')
  })
})

describe('saveDelayTargetPctAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('saves a valid target %', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(saveDelayTargetPct).mockResolvedValue()

    const result = await saveDelayTargetPctAction(20)
    expect(requireRole).toHaveBeenCalledWith(['admin'])
    expect(saveDelayTargetPct).toHaveBeenCalledWith(20)
    expect(result.success).toBe(true)
  })

  it('saves null to clear the target', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(saveDelayTargetPct).mockResolvedValue()

    const result = await saveDelayTargetPctAction(null)
    expect(saveDelayTargetPct).toHaveBeenCalledWith(null)
    expect(result.success).toBe(true)
  })

  it('rejects pct > 100', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)

    const result = await saveDelayTargetPctAction(150)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/0 and 100/i)
  })

  it('rejects negative pct', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)

    const result = await saveDelayTargetPctAction(-5)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/0 and 100/i)
  })
})
