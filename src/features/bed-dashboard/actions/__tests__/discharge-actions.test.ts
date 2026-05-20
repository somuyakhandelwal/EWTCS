import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({ requireWriteRole: vi.fn() }))
vi.mock('@/shared/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/shared/lib/db', () => ({
  default: { connect: vi.fn() },
}))
vi.mock('@/shared/lib/pii-detector', () => ({
  detectPii: vi.fn(() => ({ hasPii: false, summary: '' })),
  redactPii: vi.fn((value: string) => value),
}))
vi.mock('../../lib/bed-queries', () => ({ checkWardAccess: vi.fn() }))
vi.mock('../../lib/discharge-queries', () => ({
  fetchBedForDischarge: vi.fn(),
  fetchDischargeStages: vi.fn(),
  insertDischargeLogs: vi.fn(),
  archiveAndResetBed: vi.fn(),
}))

import pool from '@/shared/lib/db'
import { requireWriteRole } from '@/shared/lib/auth'
import { checkWardAccess } from '../../lib/bed-queries'
import {
  fetchBedForDischarge,
  fetchDischargeStages,
  insertDischargeLogs,
  archiveAndResetBed,
} from '../../lib/discharge-queries'
import { dischargeAndResetBed } from '../discharge-actions'

const BED = {
  id: 'bed-1',
  currentStageId: 'stage-initial-investigation',
  currentStageName: 'Initial Investigation',
  patientStartTime: new Date('2026-03-15T08:00:00.000Z'),
  lastStageChange: new Date('2026-03-15T08:05:00.000Z'),
  isOccupied: true,
}

const STAGES = {
  dischargeStage: { id: 'stage-discharge', name: 'Discharge Process' },
  cleaningStage: { id: 'stage-clean', name: 'Cleaning' },
}

describe('dischargeAndResetBed failure safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rolls back and does not reset bed when discharge logs fail', async () => {
    vi.mocked(requireWriteRole).mockResolvedValue({ userId: 'u-1', role: 'nurse' } as never)
    vi.mocked(checkWardAccess).mockResolvedValue(null)
    vi.mocked(fetchBedForDischarge).mockResolvedValue(BED)
    vi.mocked(fetchDischargeStages).mockResolvedValue(STAGES)
    vi.mocked(insertDischargeLogs).mockRejectedValue(new Error('insert failed'))

    const query = vi
      .fn()
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // ROLLBACK

    const release = vi.fn()
    vi.mocked(pool.connect).mockResolvedValueOnce({ query, release } as never)

    const result = await dischargeAndResetBed({ bedId: 'bed-1', notes: 'ok' })

    expect(result.success).toBe(false)
    expect(insertDischargeLogs).toHaveBeenCalledOnce()
    expect(archiveAndResetBed).not.toHaveBeenCalled()
    expect(query).toHaveBeenCalledWith('ROLLBACK')
    const sqls = query.mock.calls.map(([sql]) => String(sql))
    expect(sqls.some((sql) => sql.includes('UPDATE beds'))).toBe(false)
    expect(release).toHaveBeenCalled()
  })
})
