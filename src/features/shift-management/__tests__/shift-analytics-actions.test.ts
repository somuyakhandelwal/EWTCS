// Tests for US-8.3 & US-8.4 — Shift Performance Report & Comparison
// Verifies fetchShiftReport and fetchShiftComparison server action behaviour.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('../lib/shift-analytics-queries', () => ({
  getShiftReport: vi.fn(),
  getAllShiftsComparison: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import { getShiftReport, getAllShiftsComparison } from '../lib/shift-analytics-queries'
import {
  fetchShiftReport,
  fetchShiftComparison,
} from '../actions/shift-analytics-actions'
import type { ShiftPerformanceRow, ShiftComparisonReport } from '@/features/management-report/types/report.types'

const START = new Date('2026-02-20T00:00:00.000Z')
const END = new Date('2026-02-20T23:59:59.000Z')
const SHIFT_ID = 'shift-morning-uuid'

const MORNING_ROW: ShiftPerformanceRow = {
  shiftId: SHIFT_ID,
  shiftName: 'Morning',
  startTime: '06:00:00',
  endTime: '14:00:00',
  crossesMidnight: false,
  patientsTreated: 20,
  avgTatMs: 4500000,
  delayCount: 2,
}

const EVENING_ROW: ShiftPerformanceRow = {
  shiftId: 'shift-evening-uuid',
  shiftName: 'Evening',
  startTime: '14:00:00',
  endTime: '22:00:00',
  crossesMidnight: false,
  patientsTreated: 15,
  avgTatMs: 5000000,
  delayCount: 4,
}

// ---------------------------------------------------------------------------
// fetchShiftReport (US-8.3)
// ---------------------------------------------------------------------------
describe('fetchShiftReport', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the report row on success', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'supervisor' } as never)
    vi.mocked(getShiftReport).mockResolvedValue(MORNING_ROW)

    const result = await fetchShiftReport({ shiftId: SHIFT_ID, startDate: START, endDate: END })

    expect(requireRole).toHaveBeenCalledWith(['supervisor', 'admin', 'auditor'])
    expect(result.success).toBe(true)
    expect(result.data?.shiftName).toBe('Morning')
    expect(result.data?.patientsTreated).toBe(20)
    expect(result.data?.delayCount).toBe(2)
  })

  it('returns error when shift not found', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'supervisor' } as never)
    vi.mocked(getShiftReport).mockResolvedValue(null)

    const result = await fetchShiftReport({ shiftId: 'bad-id', startDate: START, endDate: END })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Shift not found')
  })

  it('accepts ISO string dates', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getShiftReport).mockResolvedValue(MORNING_ROW)

    const result = await fetchShiftReport({
      shiftId: SHIFT_ID,
      startDate: START.toISOString(),
      endDate: END.toISOString(),
    })

    expect(result.success).toBe(true)
  })

  it('returns error when start > end', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)

    const result = await fetchShiftReport({ shiftId: SHIFT_ID, startDate: END, endDate: START })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/start date must be before/i)
  })

  it('propagates query errors', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getShiftReport).mockRejectedValue(new Error('query timeout'))

    const result = await fetchShiftReport({ shiftId: SHIFT_ID, startDate: START, endDate: END })

    expect(result.success).toBe(false)
    expect(result.error).toBe('query timeout')
  })
})

// ---------------------------------------------------------------------------
// fetchShiftComparison (US-8.4)
// ---------------------------------------------------------------------------
describe('fetchShiftComparison', () => {
  beforeEach(() => vi.clearAllMocks())

  const REPORT: ShiftComparisonReport = {
    rows: [MORNING_ROW, EVENING_ROW],
    rangeStart: START,
    rangeEnd: END,
    bestShiftId: SHIFT_ID,          // Morning: more patients, fewer delays
    worstShiftId: 'shift-evening-uuid',
  }

  it('returns comparison report with best/worst on success', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getAllShiftsComparison).mockResolvedValue(REPORT)

    const result = await fetchShiftComparison({ startDate: START, endDate: END })

    expect(requireRole).toHaveBeenCalledWith(['supervisor', 'admin', 'auditor'])
    expect(result.success).toBe(true)
    expect(result.data?.rows).toHaveLength(2)
    expect(result.data?.bestShiftId).toBe(SHIFT_ID)
    expect(result.data?.worstShiftId).toBe('shift-evening-uuid')
  })

  it('returns all-active shifts sorted by start_time', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getAllShiftsComparison).mockResolvedValue(REPORT)

    const result = await fetchShiftComparison({ startDate: START, endDate: END })

    expect(result.data?.rows[0].shiftName).toBe('Morning')
    expect(result.data?.rows[1].shiftName).toBe('Evening')
  })

  it('returns error for invalid date range', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)

    const result = await fetchShiftComparison({ startDate: END, endDate: START })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/start date must be before/i)
  })

  it('returns error when query throws', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u1', role: 'admin' } as never)
    vi.mocked(getAllShiftsComparison).mockRejectedValue(new Error('deadlock'))

    const result = await fetchShiftComparison({ startDate: START, endDate: END })

    expect(result.success).toBe(false)
    expect(result.error).toBe('deadlock')
  })

  it('denies access for unauthorized roles', async () => {
    vi.mocked(requireRole).mockRejectedValue(
      new Error('Unauthorized: Required role(s): supervisor, admin, auditor')
    )

    const result = await fetchShiftComparison({ startDate: START, endDate: END })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
  })
})
