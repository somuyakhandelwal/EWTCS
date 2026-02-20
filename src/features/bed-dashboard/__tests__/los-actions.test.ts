// Tests for EPIC 10 / US-10.x — Average Length of Stay
//
// AC coverage:
//   AC-1: Average time calculated from admission to discharge (total_duration_ms)
//   AC-2: Average displayed in hours and minutes (formatElapsedTime)
//   AC-3: Average can be filtered by date range and shift
//   AC-4: Trend line shows how average changes over time (fetchLosTrend)
//   AC-5: Target line can be configured and displayed (saveLosTarget / fetchLosTarget)

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
import { getLosSummary, getLosTrend, getLosTargetMs } from '../lib/los-queries'
import { query } from '@/shared/lib/db'
import {
  fetchLosSummary,
  fetchLosTrend,
  fetchLosTarget,
  saveLosTarget,
} from '../actions/los-actions'
import { formatElapsedTime } from '../lib/utils'

// ── Fixtures ───────────────────────────────────────────────────────────────

const MOCK_SUMMARY = {
  totalPatients: 25,
  averageLosMs: 4 * 60 * 60 * 1000,   // 4 hours
  medianLosMs: 3.5 * 60 * 60 * 1000,
  minLosMs: 1 * 60 * 60 * 1000,
  maxLosMs: 8 * 60 * 60 * 1000,
  p75LosMs: 5 * 60 * 60 * 1000,
  p90LosMs: 7 * 60 * 60 * 1000,
  targetLosMs: 5 * 60 * 60 * 1000,    // 5-hour target
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
    expect(formatElapsedTime(4 * 3600000)).toBe('4h')          // exact hours → no trailing 0m
    expect(formatElapsedTime(90 * 60000)).toBe('1h 30m')       // 1.5 hours
    expect(formatElapsedTime(45 * 60000)).toBe('45m')          // < 1 hour
    expect(formatElapsedTime(0)).toBe('< 1m')                  // < 1 minute
    expect(formatElapsedTime(30000)).toBe('< 1m')              // 30 seconds
    expect(formatElapsedTime(5 * 3600000 + 15 * 60000)).toBe('5h 15m') // mixed
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

// ── AC-4: Trend line shows how average changes over time ───────────────────

describe('AC-4 — trend line data (daily averages)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetchLosTrend returns daily trend points in ascending order', async () => {
    mockAdminSession()
    vi.mocked(getLosTrend).mockResolvedValue(MOCK_TREND)

    const result = await fetchLosTrend()

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(3)
    expect(result.data![0].date).toBe('2026-02-18')
    expect(result.data![2].date).toBe('2026-02-20')
  })

  it('each trend point has date, averageLosMs and patientCount', async () => {
    mockAdminSession()
    vi.mocked(getLosTrend).mockResolvedValue(MOCK_TREND)

    const result = await fetchLosTrend()
    const point = result.data![1]

    expect(point).toHaveProperty('date')
    expect(point).toHaveProperty('averageLosMs')
    expect(point).toHaveProperty('patientCount')
    expect(typeof point.averageLosMs).toBe('number')
    expect(typeof point.patientCount).toBe('number')
  })

  it('fetchLosTrend returns empty array when no data', async () => {
    mockAdminSession()
    vi.mocked(getLosTrend).mockResolvedValue([])

    const result = await fetchLosTrend()
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })

  it('fetchLosTrend is accessible by auditor', async () => {
    mockAuditorSession()
    vi.mocked(getLosTrend).mockResolvedValue(MOCK_TREND)

    const result = await fetchLosTrend()
    expect(result.success).toBe(true)
  })

  it('fetchLosTrend returns error when query fails', async () => {
    mockAdminSession()
    vi.mocked(getLosTrend).mockRejectedValue(new Error('DB error'))

    const result = await fetchLosTrend()
    expect(result.success).toBe(false)
    expect(result.error).toBe('DB error')
  })
})

// ── AC-5: Target line can be configured and displayed ─────────────────────

describe('AC-5 — configurable target line', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetchLosTarget returns targetMinutes when configured', async () => {
    mockAdminSession()
    // 5 hours = 300 minutes = 18_000_000 ms
    vi.mocked(getLosTargetMs).mockResolvedValue(18_000_000)

    const result = await fetchLosTarget()

    expect(result.success).toBe(true)
    expect(result.targetMinutes).toBe(300)
  })

  it('fetchLosTarget returns null when no target is configured', async () => {
    mockSupervisorSession()
    vi.mocked(getLosTargetMs).mockResolvedValue(null)

    const result = await fetchLosTarget()

    expect(result.success).toBe(true)
    expect(result.targetMinutes).toBeNull()
  })

  it('saveLosTarget upserts value to system_settings (admin)', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'admin-1', role: 'admin' } as never)
    vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 1 } as never)

    const result = await saveLosTarget(300)

    expect(result.success).toBe(true)
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('system_settings'),
      expect.arrayContaining(['300'])
    )
  })

  it('saveLosTarget is blocked for supervisor role', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Insufficient role'))

    const result = await saveLosTarget(300)
    expect(result.success).toBe(false)
  })

  it('saveLosTarget rejects non-positive minute values', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'admin-1', role: 'admin' } as never)

    const result = await saveLosTarget(-10)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Target must be a positive number of minutes')
  })

  it('saveLosTarget accepts null to clear the target (DELETE path)', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'admin-1', role: 'admin' } as never)
    vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 1 } as never)

    const result = await saveLosTarget(null)
    expect(result.success).toBe(true)
    // null path calls DELETE, not INSERT
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM system_settings')
    )
  })

  it('summary includes targetLosMs so UI can render target line', async () => {
    mockAdminSession()
    vi.mocked(getLosSummary).mockResolvedValue(MOCK_SUMMARY)

    const result = await fetchLosSummary()
    expect(result.data?.targetLosMs).toBe(5 * 3600000)
  })
})
