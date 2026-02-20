// Tests for US-10.1 — Total Patients Treated
// Verifies fetchPatientCountSummary server action behaviour.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('../lib/patient-count-queries', () => ({
  getPatientCountSummary: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import { getPatientCountSummary } from '../lib/patient-count-queries'
import { fetchPatientCountSummary } from '../actions/patient-count-actions'

const START = new Date('2026-02-20T00:00:00.000Z')
const END = new Date('2026-02-20T23:59:59.000Z')

describe('fetchPatientCountSummary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns summary for all shifts', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getPatientCountSummary).mockResolvedValue({
      totalPatients: 42,
      avgDurationMs: 5400000,
      rangeStart: START,
      rangeEnd: END,
      shiftName: null,
    })

    const result = await fetchPatientCountSummary({ startDate: START, endDate: END })

    expect(requireRole).toHaveBeenCalledWith(['supervisor', 'admin', 'auditor'])
    expect(result.success).toBe(true)
    expect(result.data?.totalPatients).toBe(42)
    expect(result.data?.shiftName).toBeNull()
  })

  it('passes shiftId to query when provided', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getPatientCountSummary).mockResolvedValue({
      totalPatients: 18,
      avgDurationMs: 3600000,
      rangeStart: START,
      rangeEnd: END,
      shiftName: 'Morning',
    })

    const shiftId = 'shift-uuid-morning'
    const result = await fetchPatientCountSummary({ startDate: START, endDate: END, shiftId })

    expect(getPatientCountSummary).toHaveBeenCalledWith(START, END, shiftId)
    expect(result.success).toBe(true)
    expect(result.data?.shiftName).toBe('Morning')
    expect(result.data?.totalPatients).toBe(18)
  })

  it('accepts ISO string dates', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getPatientCountSummary).mockResolvedValue({
      totalPatients: 5,
      avgDurationMs: null,
      rangeStart: START,
      rangeEnd: END,
      shiftName: null,
    })

    const result = await fetchPatientCountSummary({
      startDate: START.toISOString(),
      endDate: END.toISOString(),
    })

    expect(result.success).toBe(true)
    expect(result.data?.totalPatients).toBe(5)
  })

  it('returns error when start > end', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)

    const result = await fetchPatientCountSummary({ startDate: END, endDate: START })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/start date must be before/i)
  })

  it('returns error on invalid date strings', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)

    const result = await fetchPatientCountSummary({
      startDate: 'not-a-date',
      endDate: END.toISOString(),
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/invalid date/i)
  })

  it('returns error when query throws', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getPatientCountSummary).mockRejectedValue(new Error('db connection lost'))

    const result = await fetchPatientCountSummary({ startDate: START, endDate: END })

    expect(result.success).toBe(false)
    expect(result.error).toBe('db connection lost')
  })

  it('propagates auth error when role is insufficient', async () => {
    vi.mocked(requireRole).mockRejectedValue(
      new Error('Unauthorized: Required role(s): supervisor, admin, auditor')
    )

    const result = await fetchPatientCountSummary({ startDate: START, endDate: END })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
  })
})
