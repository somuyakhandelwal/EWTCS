import { describe, it, expect } from 'vitest'

import { UPDATE_BED_STAGE_SQL } from '../lib/bed-mutations.constants'

describe('UPDATE_BED_STAGE_SQL demographics safety', () => {
  it('does not clear patient demographics in shared stage updates', () => {
    const sql = UPDATE_BED_STAGE_SQL

    expect(sql).not.toMatch(/patient_uhid\s*=\s*CASE/i)
    expect(sql).not.toMatch(/patient_ipd_id\s*=\s*CASE/i)
    expect(sql).not.toMatch(/patient_name\s*=\s*CASE/i)
    expect(sql).not.toMatch(/patient_age\s*=\s*CASE/i)
    expect(sql).not.toMatch(/patient_gender\s*=\s*CASE/i)
    expect(sql).not.toMatch(/key_symptom\s*=\s*CASE/i)
    expect(sql).not.toMatch(/triage_category\s*=\s*CASE/i)
    expect(sql).not.toContain("metadata - 'triageInfo'")
  })
})
