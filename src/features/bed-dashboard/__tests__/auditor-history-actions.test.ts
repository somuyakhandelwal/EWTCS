import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../lib/auditor-history-queries', () => ({
  fetchAuditorHistory: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import { fetchAuditorHistory } from '../lib/auditor-history-queries'
import {
  fetchAuditorBedHistory,
  exportAuditorBedHistoryCSV,
} from '../actions/auditor-history-actions'

describe('auditor-history-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchAuditorBedHistory returns rows and total count on success', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u-1', role: 'admin' } as never)
    vi.mocked(fetchAuditorHistory).mockResolvedValue({
      rows: [
        {
          id: 'log-1',
          bedId: 'bed-1',
          bedNumber: 'ER-01',
          fromStageName: 'Triage',
          toStageName: 'Doctor Assessment',
          changedByUserId: 'u-1',
          changedByUsername: 'admin1',
          transitionTime: new Date('2026-02-19T08:00:00.000Z'),
          durationInPreviousStageMs: 1000,
          notes: null,
        },
      ],
      totalCount: 1,
    })

    const result = await fetchAuditorBedHistory({ bedNumber: 'ER-01' })

    expect(requireRole).toHaveBeenCalledWith(['supervisor', 'admin', 'auditor'])
    expect(fetchAuditorHistory).toHaveBeenCalledWith({ bedNumber: 'ER-01' })
    expect(result.success).toBe(true)
    expect(result.data?.totalCount).toBe(1)
    expect(result.data?.rows[0].changedByUserId).toBe('u-1')
  })

  it('fetchAuditorBedHistory returns failure when query throws', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u-1', role: 'admin' } as never)
    vi.mocked(fetchAuditorHistory).mockRejectedValue(new Error('db error'))

    const result = await fetchAuditorBedHistory({})

    expect(result.success).toBe(false)
    expect(result.error).toBe('db error')
  })

  it('exportAuditorBedHistoryCSV fetches all pages for complete export', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: 'u-1', role: 'admin' } as never)
    vi.mocked(fetchAuditorHistory)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'log-1',
            bedId: 'bed-1',
            bedNumber: 'ER-01',
            fromStageName: 'Triage',
            toStageName: 'Doctor Assessment',
            changedByUserId: 'u-1',
            changedByUsername: 'admin1',
            transitionTime: new Date('2026-02-19T08:00:00.000Z'),
            durationInPreviousStageMs: 1000,
            notes: 'ok',
          },
        ],
        totalCount: 2,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'log-2',
            bedId: 'bed-2',
            bedNumber: 'ER-02',
            fromStageName: 'Registration',
            toStageName: 'Doctor Assessment',
            changedByUserId: 'u-2',
            changedByUsername: 'admin2',
            transitionTime: new Date('2026-02-19T09:00:00.000Z'),
            durationInPreviousStageMs: 2000,
            notes: null,
          },
        ],
        totalCount: 2,
      })

    const result = await exportAuditorBedHistoryCSV({ bedNumber: 'ER-01' })

    expect(fetchAuditorHistory).toHaveBeenNthCalledWith(1, {
      bedNumber: 'ER-01',
      limit: 500,
      offset: 0,
    })
    expect(fetchAuditorHistory).toHaveBeenNthCalledWith(2, {
      bedNumber: 'ER-01',
      limit: 500,
      offset: 500,
    })
    expect(result.success).toBe(true)
    expect(result.data).toContain('Changed By User ID')
    expect(result.data).toContain('ER-01')
    expect(result.data).toContain('ER-02')
  })

  it('exportAuditorBedHistoryCSV returns failure when unauthorized', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))

    const result = await exportAuditorBedHistoryCSV({})

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })
})