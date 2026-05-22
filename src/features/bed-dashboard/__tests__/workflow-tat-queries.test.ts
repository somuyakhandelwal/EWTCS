import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/db', () => ({
  query: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

import { query } from '@/shared/lib/db'
import {
  getErCleaningTatRecords,
  getErTatRecords,
  getErTatSummary,
  getTriageTatRecords,
  getTriageTatSummary,
  getTriageCleaningTatRecords,
} from '../lib/stage-analytics'

describe('workflow TAT queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('parses ER whole TAT summary values', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      rows: [
        {
          totalCycles: '3',
          averageDurationMs: '1200000',
          minDurationMs: '300000',
          maxDurationMs: '2400000',
          medianDurationMs: '900000',
          p90DurationMs: '2100000',
        },
      ],
    } as never)

    const summary = await getErTatSummary()

    expect(summary).toEqual({
      totalCycles: 3,
      averageDurationMs: 1_200_000,
      minDurationMs: 300_000,
      maxDurationMs: 2_400_000,
      medianDurationMs: 900_000,
      p90DurationMs: 2_100_000,
    })
  })

  it('returns an empty triage whole TAT summary when no cycles exist', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)

    const summary = await getTriageTatSummary()

    expect(summary.totalCycles).toBe(0)
    expect(summary.averageDurationMs).toBe(0)
    expect(summary.medianDurationMs).toBeNull()
  })

  it('filters ER records to ER beds and cleaning completion boundaries', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)

    await getErTatRecords()

    const [sql] = vi.mocked(query).mock.calls[0] ?? []
    expect(String(sql)).toContain("JOIN wards w ON w.id = b.ward_id AND w.code = 'ER'")
    expect(String(sql)).toContain("LOWER(sl.to_stage_name) = 'cleaning'")
    expect(String(sql)).toContain("LOWER(sl.from_stage_name) = 'empty'")
    expect(String(sql)).toContain('ts.is_active = true')
    expect(String(sql)).toContain("LOWER(sl.to_stage_name) NOT IN ('empty', 'cleaning', 'triage')")
  })

  it('keeps ER cleaning TAT separate from whole ER TAT', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)

    await getErCleaningTatRecords()

    const [sql] = vi.mocked(query).mock.calls[0] ?? []
    expect(String(sql)).toContain("LOWER(sl.from_stage_name) = 'cleaning'")
    expect(String(sql)).toContain("LOWER(sl.to_stage_name) = 'empty'")
    expect(String(sql)).not.toContain('er_start_events')
  })

  it('calculates triage whole TAT from assignment to cleaning entry', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)

    await getTriageTatRecords()

    const [sql] = vi.mocked(query).mock.calls[0] ?? []
    expect(String(sql)).toContain("tsl.to_state = 'initial_treatment'")
    expect(String(sql)).toContain("tsl.to_state = 'cleaning'")
    expect(String(sql)).toContain('c.cleaning_at - s.started_at')
    expect(String(sql)).not.toContain("tsl.to_state = 'empty'")
  })

  it('reads triage cleaning TAT from triage_state_logs', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)

    await getTriageCleaningTatRecords()

    const [sql] = vi.mocked(query).mock.calls[0] ?? []
    expect(String(sql)).toContain('FROM triage_state_logs tsl')
    expect(String(sql)).toContain("tsl.from_state = 'cleaning'")
    expect(String(sql)).toContain("tsl.to_state = 'empty'")
  })

  it('ignores incomplete workflow cycles until a cleaning entry exists', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)

    await getErTatRecords()

    const [sql] = vi.mocked(query).mock.calls[0] ?? []
    expect(String(sql)).toContain('FROM er_cleaning_events c')
    expect(String(sql)).toContain('JOIN LATERAL')
    expect(String(sql)).not.toContain('NOW() - se.started_at')
  })
})
