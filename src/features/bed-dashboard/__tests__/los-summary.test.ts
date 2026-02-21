// Tests for EPIC 10 / US-10.x — AC-1, AC-2, AC-3
//
// AC-1: Average time calculated from admission to discharge (total_duration_ms)
// AC-2: Average displayed in hours and minutes (formatElapsedTime)
// AC-3: Average can be filtered by date range and shift

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/shared/lib/auth', () => ({
  requireRole: vi.fn(),
  requireWriteRole: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('../lib/los-queries', () => ({
  getLosSummary: vi.fn(),
  getLosTrend: vi.fn(),
  getLosTargetMs: vi.fn(),
}))

vi.mock('@/shared/lib/db', () => ({
  query: vi.fn(),
  default: { query: vi.fn() },
}))

import { requireRole } from '@/shared/lib/auth'
import { getLosSummary, getLosTrend } from '../lib/los-queries'
import { fetchLosSummary, fetchLosTrend } from '../actions/los-actions'
import { formatElapsedTime } from '../lib/utils'

// ── Fixtures ───────────────────────────────────────────────────────────────

const MOCK_SUMMARY = {
  totalPatients: 25,
  averageLosMs: 4 * 60 * 60 * 1000,
  medianLosMs: 3.5 * 60 * 60 * 1000,
  minLosMs: 1 * 60 * 60 * 1000,
  maxLosMs: 8 * 60 * 60 * 1000,
  p75LosMs: 5 * 60 * 60 * 1000,
  p90LosMs: 7 * 60 * 60 * 1000,
  targetLosMs: 5 * 60 * 60 * 1000,
}

const MOCK_TREND = [
  { date: '2026-02-18', averageLosMs: 3.5 * 3600000, patientCount: 8 },
  { date: '2026-02-19', averageLosMs: 4.0 * 3600000, patientCount: 9 },
  { date: '2026-02-20', averageLosMs: 4.5 * 3600000, patientCount: 8 },
]

function mockAdminSession() {
  vi.mocked(requireRole).mockResolvedValue({ userId: 'admin-1', role: 'admin' } as never)
}
function mockSupervisorSession() {
  vi.mocked(requireRole).mockResolvedValue({ userId: 'sup-1', role: 'supervisor' } as never)
}
function mockAuditorSession() {
  vi.mocked(requireRole).mockResolvedValue({ userId: 'aud-1', role: 'auditor' } as never)
}

// ── AC-1 & AC-2: Average LoS calculated and formatted ─────────────────────

describe('AC-1 & AC-2 — average LoS from admission→discharge, formatted in h/m', () => {
  beforeEach(() => vi.clearAllMocks())

  it('formatElapsedTime renders hours and minutes correctly', () => {
    expect(formatElapsedTime(4 * 3600000)).toBe('4h')
    expect(formatElapsedTime(90 * 60000)).toBe('1h 30m')
    expect(formatElapsedTime(45 * 60000)).toBe('45m')
    expect(formatElapsedTime(0)).toBe('< 1m')
    expect(formatElapsedTime(30000)).toBe('< 1m')
    expect(formatElapsedTime(5 * 3600000 + 15 * 60000)).toBe('5h 15m')
  })

  it('fetchLosSummary returns averageLosMs derived from total_duration_ms', async () => {
    mockAdminSession()
    vi.mocked(getLosSummary).mockResolvedValue(MOCK_SUMMARY)

    const result = await fetchLosSummary()

    expect(result.success).toBe(true)
    expect(result.data?.averageLosMs).toBe(4 * 3600000)
    expect(result.data?.totalPatients).toBe(25)
  })

  it('fetchLosSummary is accessible by supervisor', async () => {
    mockSupervisorSession()
    vi.mocked(getLosSummary).mockResolvedValue(MOCK_SUMMARY)

    const result = await fetchLosSummary()
    expect(result.success).toBe(true)
  })

  it('fetchLosSummary is accessible by auditor (read-only)', async () => {
    mockAuditorSession()
    vi.mocked(getLosSummary).mockResolvedValue(MOCK_SUMMARY)

    const result = await fetchLosSummary()
    expect(result.success).toBe(true)
  })

  it('fetchLosSummary returns error when role check throws', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Forbidden'))

    const result = await fetchLosSummary()
    expect(result.success).toBe(false)
    expect(result.error).toBe('Forbidden')
  })

  it('fetchLosSummary calls requireRole with admin, supervisor, auditor', async () => {
    mockAdminSession()
    vi.mocked(getLosSummary).mockResolvedValue(MOCK_SUMMARY)

    await fetchLosSummary()
    expect(requireRole).toHaveBeenCalledWith(['admin', 'supervisor', 'auditor'])
  })
})

// ── AC-3: Filtered by date range and shift ─────────────────────────────────

describe('AC-3 — filterable by date range and shift', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes date range filters through to getLosSummary', async () => {
    mockAdminSession()
    vi.mocked(getLosSummary).mockResolvedValue(MOCK_SUMMARY)

    const start = new Date('2026-02-01')
    const end = new Date('2026-02-20')
    await fetchLosSummary({ startDate: start, endDate: end })

    expect(getLosSummary).toHaveBeenCalledWith({ startDate: start, endDate: end })
  })

  it('passes shift filters through to getLosSummary', async () => {
    mockAdminSession()
    vi.mocked(getLosSummary).mockResolvedValue(MOCK_SUMMARY)

    const filters = {
      shiftStartTime: '08:00:00',
      shiftEndTime: '16:00:00',
      shiftCrossesMidnight: false,
    }
    await fetchLosSummary(filters)
    expect(getLosSummary).toHaveBeenCalledWith(filters)
  })

  it('passes midnight-crossing night shift filter', async () => {
    mockAdminSession()
    vi.mocked(getLosSummary).mockResolvedValue(MOCK_SUMMARY)

    const filters = {
      shiftStartTime: '22:00:00',
      shiftEndTime: '08:00:00',
      shiftCrossesMidnight: true,
    }
    await fetchLosSummary(filters)
    expect(getLosSummary).toHaveBeenCalledWith(filters)
  })

  it('passes date+shift combined filter to getLosTrend', async () => {
    mockSupervisorSession()
    vi.mocked(getLosTrend).mockResolvedValue(MOCK_TREND)

    const filters = {
      startDate: new Date('2026-02-01'),
      shiftStartTime: '08:00:00',
      shiftEndTime: '16:00:00',
      shiftCrossesMidnight: false,
    }
    await fetchLosTrend(filters)
    expect(getLosTrend).toHaveBeenCalledWith(filters)
  })
})
