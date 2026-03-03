// Tests for US-8.2 — Shift Resolution & Midnight Boundary (shift-utils.ts)
// Verifies resolveCurrentShift correctly extracts and passes the time string
// to the DB query, handles the midnight-crossing Night shift, and maps results.
// Epic 8: Shift Management

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/shared/lib/db', () => ({ query: vi.fn() }))
// server-only is aliased in vitest.config.ts → src/__tests__/mocks/server-only.ts

import { query } from '@/shared/lib/db'
import { resolveCurrentShift } from '../lib/shift-utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Date whose local HH:MM:SS equals the given values. */
function makeLocalDate(hours: number, minutes: number, seconds = 0): Date {
  const d = new Date()
  d.setHours(hours, minutes, seconds, 0)
  return d
}

/** Expected time string the function passes to the DB. */
function expectedTimeStr(d: Date): string {
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const DB_MORNING_SHIFT = {
  id: 'shift-morning-id',
  name: 'Morning',
  start_time: '06:00:00',
  end_time: '14:00:00',
  crosses_midnight: false,
  is_default: true,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const DB_NIGHT_SHIFT = {
  id: 'shift-night-id',
  name: 'Night',
  start_time: '22:00:00',
  end_time: '06:00:00',
  crosses_midnight: true,
  is_default: true,
  is_active: true,
  created_at: '2026-01-01T00:02:00Z',
  updated_at: '2026-01-01T00:02:00Z',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('resolveCurrentShift', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Basic resolution ────────────────────────────────────────────────────

  it('returns the shift row that the DB resolves', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [DB_MORNING_SHIFT] } as never)

    const at = makeLocalDate(8, 30)
    const result = await resolveCurrentShift(at)

    expect(result).not.toBeNull()
    expect(result!.name).toBe('Morning')
    expect(result!.id).toBe('shift-morning-id')
  })

  it('returns null when no shift covers the given time', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    const result = await resolveCurrentShift(makeLocalDate(5, 59))

    expect(result).toBeNull()
  })

  // ── Time string format ──────────────────────────────────────────────────

  it('passes HH:MM:SS formatted local time to the DB query', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [DB_MORNING_SHIFT] } as never)

    const at = makeLocalDate(9, 5, 42)
    await resolveCurrentShift(at)

    const passedParam = vi.mocked(query).mock.calls[0][1]?.[0]
    expect(passedParam).toBe(expectedTimeStr(at))
    // Verify zero-padding: e.g. "09:05:42"
    expect(passedParam).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })

  it('uses NOW() (no argument) when no Date is provided', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    const before = new Date()
    await resolveCurrentShift()
    const after = new Date()

    const passedParam = vi.mocked(query).mock.calls[0][1]?.[0] as string
    // The time string should be within the range of before–after
    expect(typeof passedParam).toBe('string')
    expect(passedParam).toMatch(/^\d{2}:\d{2}:\d{2}$/)

    // Reconstruct the time from the param and ensure it is between before and after (in local hours)
    const [hh, mm, ss] = passedParam.split(':').map(Number)
    const reconstructed = new Date()
    reconstructed.setHours(hh, mm, ss, 0)
    // Allow ±2 second drift from test execution time
    expect(Math.abs(reconstructed.getTime() - before.getTime())).toBeLessThan(5000)
  })

  // ── Midnight boundary ────────────────────────────────────────────────────

  it('passes the correct time string at 23:30 (deep Night shift territory)', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [DB_NIGHT_SHIFT] } as never)

    const at = makeLocalDate(23, 30, 0)
    const result = await resolveCurrentShift(at)

    // Verify the param is "23:30:00"
    const passedParam = vi.mocked(query).mock.calls[0][1]?.[0]
    expect(passedParam).toBe('23:30:00')
    expect(result!.name).toBe('Night')
  })

  it('passes the correct time string at 02:15 (Night shift, past midnight)', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [DB_NIGHT_SHIFT] } as never)

    const at = makeLocalDate(2, 15, 0)
    const result = await resolveCurrentShift(at)

    const passedParam = vi.mocked(query).mock.calls[0][1]?.[0]
    expect(passedParam).toBe('02:15:00')
    expect(result!.name).toBe('Night')
  })

  it('passes "00:00:00" at exact midnight — Night shift boundary', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [DB_NIGHT_SHIFT] } as never)

    const at = makeLocalDate(0, 0, 0)
    await resolveCurrentShift(at)

    const passedParam = vi.mocked(query).mock.calls[0][1]?.[0]
    expect(passedParam).toBe('00:00:00')
  })

  it('passes "22:00:00" at exact Night shift start', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [DB_NIGHT_SHIFT] } as never)

    const at = makeLocalDate(22, 0, 0)
    await resolveCurrentShift(at)

    const passedParam = vi.mocked(query).mock.calls[0][1]?.[0]
    expect(passedParam).toBe('22:00:00')
  })

  // ── Error propagation ────────────────────────────────────────────────────

  it('propagates DB errors', async () => {
    vi.mocked(query).mockRejectedValue(new Error('DB offline'))

    await expect(resolveCurrentShift(makeLocalDate(8, 0))).rejects.toThrow('DB offline')
  })
})
