import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/shared/lib/db', () => ({
  query: vi.fn(),
}))

import {
  buildCutoffs,
  collectResults,
} from '../lib/archival-run-helpers'

describe('archival-run-helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-21T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('buildCutoffs uses per-table years and configurable stage-log day retention', () => {
    const cutoffs = buildCutoffs({
      patientAdmissionsYears: 7,
      auditLogsYears: 2,
      bedStageLogDays: 120,
      requiresApproval: true,
    })

    expect(cutoffs.patientAdmissions.toISOString()).toBe('2019-02-21T00:00:00.000Z')
    expect(cutoffs.auditLogs.toISOString()).toBe('2024-02-21T00:00:00.000Z')
    expect(cutoffs.bedStageLogs.toISOString()).toBe('2025-10-24T00:00:00.000Z')
  })

  it('collectResults aggregates row counts and errors', () => {
    const result = collectResults([
      { table: 'patient_admissions', rowsMoved: 12 },
      { table: 'audit_logs', rowsMoved: 8, error: 'timeout' },
      { table: 'bed_stage_logs', rowsMoved: 41 },
    ])

    expect(result.rowsArchived).toEqual({
      patient_admissions: 12,
      audit_logs: 8,
      bed_stage_logs: 41,
    })
    expect(result.errors).toEqual(['audit_logs: timeout'])
  })
})
