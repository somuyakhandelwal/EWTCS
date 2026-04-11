import { describe, it, expect, vi } from 'vitest'

import { archiveAndResetBed } from '../lib/discharge-queries'

const NOW = new Date('2026-03-15T10:00:00.000Z')
const ADMITTED_AT = new Date('2026-03-15T08:30:00.000Z')

describe('archiveAndResetBed', () => {
  it('clears demographics only after archival insert succeeds', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] }) // prev discharge
      .mockResolvedValueOnce({ rows: [{ id: 'adm-1' }] }) // insert admission
      .mockResolvedValueOnce({}) // reset bed
      .mockResolvedValueOnce({}) // close delay reasons

    const client = { query } as never

    await archiveAndResetBed(client, {
      bedId: 'bed-1',
      admittedAt: ADMITTED_AT,
      now: NOW,
      totalDurationMs: NOW.getTime() - ADMITTED_AT.getTime(),
      cleaningStageId: 'stage-clean',
      userId: 'user-1',
      notes: null,
    })

    const updateSql = query.mock.calls[2][0] as string

    expect(updateSql).toMatch(/patient_start_time\s*=\s*NULL/)
    expect(updateSql).toMatch(/patient_uhid\s*=\s*NULL/)
    expect(updateSql).toMatch(/patient_ipd_id\s*=\s*NULL/)
    expect(updateSql).toMatch(/patient_name\s*=\s*NULL/)
    expect(updateSql).toMatch(/patient_age\s*=\s*NULL/)
    expect(updateSql).toMatch(/patient_gender\s*=\s*NULL/)
    expect(updateSql).toMatch(/key_symptom\s*=\s*NULL/)
    expect(updateSql).toMatch(/triage_category\s*=\s*NULL/)
    expect(updateSql).toContain("metadata           = metadata - 'triageInfo'")
  })
})
