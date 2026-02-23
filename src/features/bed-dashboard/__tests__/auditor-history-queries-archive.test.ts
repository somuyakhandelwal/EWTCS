import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/db', () => ({
  query: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

import { query } from '@/shared/lib/db'
import { fetchAuditorHistory } from '../lib/auditor-history-queries'

describe('fetchAuditorHistory archive coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries live and archived stage logs with bed/date filters', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [{ totalCount: '1' }] } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'log-1',
            bedId: 'bed-1',
            bedNumber: 'ER-01',
            fromStageName: 'Triage',
            toStageName: 'Doctor Assessment',
            changedByUserId: 'u-1',
            changedByUsername: 'nurse1',
            transitionTime: new Date('2026-02-20T10:00:00.000Z'),
            durationInPreviousStageMs: 60000,
            notes: 'ok',
          },
        ],
      } as never)

    const result = await fetchAuditorHistory({
      bedNumber: 'ER-01',
      startDate: new Date('2026-02-01T00:00:00.000Z'),
      endDate: new Date('2026-02-28T23:59:59.999Z'),
      limit: 20,
      offset: 0,
    })

    const firstSql = vi.mocked(query).mock.calls[0][0] as string
    const secondSql = vi.mocked(query).mock.calls[1][0] as string

    expect(firstSql).toContain('bed_stage_logs_archive')
    expect(secondSql).toContain('bed_stage_logs_archive')
    expect(firstSql).toContain('sl.bed_number ILIKE')
    expect(firstSql).toContain('sl.transition_time >=')
    expect(firstSql).toContain('sl.transition_time <=')

    expect(result.totalCount).toBe(1)
    expect(result.rows[0].bedNumber).toBe('ER-01')
  })
})
