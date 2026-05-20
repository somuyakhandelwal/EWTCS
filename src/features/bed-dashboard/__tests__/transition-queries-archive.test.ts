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
import { getStageTransitions } from '../lib/transition-queries'

describe('getStageTransitions archive coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries live and archived logs and returns metadata', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      rows: [
        {
          id: 'log-1',
          bedNumber: 'ER-01',
          bedId: 'bed-1',
          fromStageName: 'Initial Investigation',
          toStageName: 'Initial Treatment',
          transitionTime: new Date('2026-02-20T10:00:00.000Z'),
          durationInPreviousStageMs: 120000,
          durationInCurrentStageMs: 60000,
          changedByUserId: 'u-1',
          changedByUsername: 'nurse1',
          notes: 'ok',
        },
      ],
    } as never)

    const rows = await getStageTransitions(
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-28T23:59:59.999Z'),
      'bed-1',
    )

    const sql = vi.mocked(query).mock.calls[0][0] as string

    expect(sql).toContain('bed_stage_logs_archive')
    expect(sql).toContain('logs_with_duration')
    expect(sql).toContain('changedByUserId')
    expect(rows[0].changedByUserId).toBe('u-1')
  })
})
