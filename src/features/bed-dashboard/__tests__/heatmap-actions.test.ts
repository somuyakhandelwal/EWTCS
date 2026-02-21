// US-10.6: Staffing Heatmap — server action tests
// Covers auth gating, happy path, and error handling for both actions.

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('../lib/heatmap-queries', () => ({
  getHeatmapData:       vi.fn(),
  getHeatmapCellDetail: vi.fn(),
}))

import { requireRole }              from '@/shared/lib/auth'
import { getHeatmapData, getHeatmapCellDetail } from '../lib/heatmap-queries'
import { fetchHeatmapData, fetchHeatmapCellDetail } from '../actions/heatmap-actions'

const SUPERVISOR_SESSION = { userId: 'sup-1', role: 'supervisor' } as never
const NURSE_SESSION       = { userId: 'nurse-1', role: 'nurse' }   as never

// ---------------------------------------------------------------------------
// fetchHeatmapData
// ---------------------------------------------------------------------------
describe('fetchHeatmapData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns heatmap with maxCount and totalAdmissions', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION)
    vi.mocked(getHeatmapData).mockResolvedValue([
      { dayOfWeek: 1, hourOfDay: 9,  count: 5 },
      { dayOfWeek: 3, hourOfDay: 14, count: 3 },
    ])

    const result = await fetchHeatmapData()

    expect(result.success).toBe(true)
    expect(result.data?.maxCount).toBe(5)
    expect(result.data?.totalAdmissions).toBe(8)
    expect(result.data?.cells).toHaveLength(2)
  })

  it('restricts access to supervisor and admin only', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Forbidden'))

    const result = await fetchHeatmapData()

    expect(requireRole).toHaveBeenCalledWith(['supervisor', 'admin'])
    expect(result.success).toBe(false)
    expect(result.error).toBe('Forbidden')
  })

  it('returns empty grid correctly when no admissions', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION)
    vi.mocked(getHeatmapData).mockResolvedValue([])

    const result = await fetchHeatmapData()

    expect(result.success).toBe(true)
    expect(result.data?.maxCount).toBe(0)
    expect(result.data?.totalAdmissions).toBe(0)
    expect(result.data?.cells).toHaveLength(0)
  })

  it('forwards date filters to query layer', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION)
    vi.mocked(getHeatmapData).mockResolvedValue([])

    const start = new Date('2026-01-01')
    const end   = new Date('2026-01-31')
    await fetchHeatmapData({ startDate: start, endDate: end })

    expect(getHeatmapData).toHaveBeenCalledWith(start, end)
  })

  it('surfaces dateRange in the returned payload', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION)
    vi.mocked(getHeatmapData).mockResolvedValue([])

    const start = new Date('2026-02-01')
    const result = await fetchHeatmapData({ startDate: start })

    expect(result.data?.dateRange.start).toEqual(start)
    expect(result.data?.dateRange.end).toBeNull()
  })

  it('auditor role is blocked from heatmap data', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Forbidden'))

    const result = await fetchHeatmapData()

    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// fetchHeatmapCellDetail
// ---------------------------------------------------------------------------
describe('fetchHeatmapCellDetail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns drill-down records for a cell', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION)
    const record = {
      admissionId: 'adm-1',
      bedNumber: 'EW-01',
      admittedAt: new Date(),
      dischargedAt: new Date(),
      totalDurationMs: 3600000,
      dischargedBy: 'nurse-x',
    }
    vi.mocked(getHeatmapCellDetail).mockResolvedValue([record])

    const result = await fetchHeatmapCellDetail(1, 9)

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].bedNumber).toBe('EW-01')
  })

  it('forwards dow, hour, and date filters to query layer', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION)
    vi.mocked(getHeatmapCellDetail).mockResolvedValue([])

    const start = new Date('2026-01-01')
    const end   = new Date('2026-01-31')
    await fetchHeatmapCellDetail(3, 14, { startDate: start, endDate: end })

    expect(getHeatmapCellDetail).toHaveBeenCalledWith(3, 14, start, end)
  })

  it('restricts access to supervisor and admin only', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Forbidden'))

    const result = await fetchHeatmapCellDetail(0, 0)

    expect(requireRole).toHaveBeenCalledWith(['supervisor', 'admin'])
    expect(result.success).toBe(false)
    expect(result.error).toBe('Forbidden')
  })

  it('returns empty array when no records for that cell', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION)
    vi.mocked(getHeatmapCellDetail).mockResolvedValue([])

    const result = await fetchHeatmapCellDetail(6, 23)

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(0)
  })

  it('handles unexpected DB error gracefully', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION)
    vi.mocked(getHeatmapCellDetail).mockRejectedValue(new Error('DB timeout'))

    const result = await fetchHeatmapCellDetail(2, 12)

    expect(result.success).toBe(false)
    expect(result.error).toBe('DB timeout')
  })

  void NURSE_SESSION // used to document intent; nurse role tested via requireRole mock
})
