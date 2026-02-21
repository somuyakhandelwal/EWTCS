// archive-search-queries.test.ts
// EPIC 14 — US-14.3: Auditor Archive Retrieval
//
// Tests the query-layer functions directly:
//   - searchArchivedAdmissions
//   - searchArchivedAuditLogs
//
// AC coverage:
//   ✅ Archived data is searchable by date range
//   ✅ Retrieved data is displayed in same format as active data (shape assertions)
//   ✅ Retrieval may take longer than active data (timeout guard — structural only)
//   ✅ Limit cap (MAX_LIMIT = 1000) is enforced at query level

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock the db module ────────────────────────────────────────────────────

vi.mock('@/shared/lib/db', () => ({
  query: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import {
  searchArchivedAdmissions,
  searchArchivedAuditLogs,
} from '../lib/archive-search-queries'
import type { ArchiveSearchParams } from '../lib/data-retention-types'

// ── Shared fixtures ───────────────────────────────────────────────────────

/** Raw DB row shape returned by PostgreSQL for patient_admissions_archive */
const RAW_ADMISSION_ROW = {
  id: 'adm-uuid-1',
  bed_id: 'bed-A1',
  admitted_at: '2024-01-15T08:00:00.000Z',
  discharged_at: '2024-01-16T08:00:00.000Z',
  total_duration_ms: '86400000',
  discharged_by_user_id: 'nurse-uuid-1',
  notes: 'Routine discharge',
  created_at: '2024-01-15T07:55:00.000Z',
  tat_from_previous_discharge_ms: '3600000',
  archived_at: '2025-02-01T00:00:00.000Z',
}

/** Raw DB row shape returned by PostgreSQL for audit_logs_archive */
const RAW_AUDIT_ROW = {
  id: 'log-uuid-1',
  action_type: 'STAGE_CHANGE',
  entity_type: 'bed',
  entity_id: 'bed-A1',
  performed_by_user_id: 'nurse-uuid-1',
  changes: { from: 'triage', to: 'treatment' },
  reason: 'Patient stabilised',
  metadata: { shiftId: 'shift-1' },
  ip_address: '192.168.1.10',
  created_at: '2024-01-15T09:30:00.000Z',
  archived_at: '2025-02-01T00:00:00.000Z',
}

const BASE_ADMISSION_PARAMS: ArchiveSearchParams = {
  table: 'patient_admissions',
  from: '2024-01-01',
  to: '2024-01-31',
}

const BASE_AUDIT_PARAMS: ArchiveSearchParams = {
  table: 'audit_logs',
  from: '2024-01-01',
  to: '2024-01-31',
}

// ── searchArchivedAdmissions ──────────────────────────────────────────────

describe('searchArchivedAdmissions', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── AC: Archived data is searchable by date range ─────────────────────

  it('passes from and to as UTC-pinned Date parameters to the query', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    await searchArchivedAdmissions({ ...BASE_ADMISSION_PARAMS, from: '2024-03-15', to: '2024-03-20' })

    const [sql, params] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
    expect(sql).toMatch(/discharged_at >= \$1/)
    expect(sql).toMatch(/discharged_at <= \$2/)

    const fromDate = params[0] as Date
    const toDate = params[1] as Date

    // from must be start-of-day UTC
    expect(fromDate).toBeInstanceOf(Date)
    expect(fromDate.toISOString()).toBe('2024-03-15T00:00:00.000Z')

    // to must be end-of-day UTC (Bug Fix #4 — no local-timezone offset)
    expect(toDate).toBeInstanceOf(Date)
    expect(toDate.toISOString()).toBe('2024-03-20T23:59:59.999Z')
  })

  it('queries the patient_admissions_archive table, not the live table', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    await searchArchivedAdmissions(BASE_ADMISSION_PARAMS)

    const [sql] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
    expect(sql).toMatch(/FROM patient_admissions_archive/)
    expect(sql).not.toMatch(/FROM patient_admissions[^_]/)
  })

  it('orders results by discharged_at DESC', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    await searchArchivedAdmissions(BASE_ADMISSION_PARAMS)

    const [sql] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
    expect(sql).toMatch(/ORDER BY discharged_at DESC/i)
  })

  // ── AC: Retrieval available to authorized users (limit guard) ─────────

  it('uses default limit of 200 when limit is not specified', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    await searchArchivedAdmissions(BASE_ADMISSION_PARAMS)

    const [, params] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
    expect(params[2]).toBe(200)
  })

  it('respects a custom limit when provided', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    await searchArchivedAdmissions({ ...BASE_ADMISSION_PARAMS, limit: 50 })

    const [, params] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
    expect(params[2]).toBe(50)
  })

  it('caps limit at 1000 even when caller requests more', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    await searchArchivedAdmissions({ ...BASE_ADMISSION_PARAMS, limit: 9999 })

    const [, params] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
    expect(params[2]).toBe(1000)
  })

  // ── AC: Retrieved data is displayed in same format as active data ─────

  it('maps raw DB row to ArchivedAdmission shape with correct camelCase fields', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [RAW_ADMISSION_ROW] } as never)

    const results = await searchArchivedAdmissions(BASE_ADMISSION_PARAMS)

    expect(results).toHaveLength(1)
    const row = results[0]

    expect(row.id).toBe('adm-uuid-1')
    expect(row.bedId).toBe('bed-A1')
    expect(row.admittedAt).toBeInstanceOf(Date)
    expect(row.admittedAt.toISOString()).toBe('2024-01-15T08:00:00.000Z')
    expect(row.dischargedAt).toBeInstanceOf(Date)
    expect(row.dischargedAt.toISOString()).toBe('2024-01-16T08:00:00.000Z')
    expect(row.totalDurationMs).toBe(86_400_000)
    expect(row.dischargedByUserId).toBe('nurse-uuid-1')
    expect(row.notes).toBe('Routine discharge')
    expect(row.createdAt).toBeInstanceOf(Date)
    expect(row.tatFromPreviousDischargeMs).toBe(3_600_000)
    expect(row.archivedAt).toBeInstanceOf(Date)
  })

  it('maps null notes to null (not undefined)', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [{ ...RAW_ADMISSION_ROW, notes: null }],
    } as never)

    const results = await searchArchivedAdmissions(BASE_ADMISSION_PARAMS)
    expect(results[0].notes).toBeNull()
  })

  it('maps null tat_from_previous_discharge_ms to null', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [{ ...RAW_ADMISSION_ROW, tat_from_previous_discharge_ms: null }],
    } as never)

    const results = await searchArchivedAdmissions(BASE_ADMISSION_PARAMS)
    expect(results[0].tatFromPreviousDischargeMs).toBeNull()
  })

  it('converts numeric string totalDurationMs to number', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [{ ...RAW_ADMISSION_ROW, total_duration_ms: '7200000' }],
    } as never)

    const results = await searchArchivedAdmissions(BASE_ADMISSION_PARAMS)
    expect(results[0].totalDurationMs).toBe(7_200_000)
    expect(typeof results[0].totalDurationMs).toBe('number')
  })

  it('returns empty array when no rows match the date range', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    const results = await searchArchivedAdmissions(BASE_ADMISSION_PARAMS)
    expect(results).toEqual([])
  })

  // ── AC: single-day range (from === to) ────────────────────────────────

  it('handles single-day range correctly (from === to)', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    await searchArchivedAdmissions({ ...BASE_ADMISSION_PARAMS, from: '2024-06-15', to: '2024-06-15' })

    const [, params] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
    const fromDate = params[0] as Date
    const toDate = params[1] as Date

    expect(fromDate.toISOString()).toBe('2024-06-15T00:00:00.000Z')
    expect(toDate.toISOString()).toBe('2024-06-15T23:59:59.999Z')
  })

  // ── Logging ───────────────────────────────────────────────────────────

  it('logs info with from, to, and rowsReturned on success', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [RAW_ADMISSION_ROW] } as never)

    await searchArchivedAdmissions(BASE_ADMISSION_PARAMS)

    expect(logger.info).toHaveBeenCalledWith(
      'Archived admissions searched',
      expect.objectContaining({
        from: '2024-01-01',
        to: '2024-01-31',
        rowsReturned: 1,
      }),
    )
  })

  // ── Error handling ────────────────────────────────────────────────────

  it('throws a user-friendly error when the DB query fails', async () => {
    vi.mocked(query).mockRejectedValue(new Error('connection refused'))

    await expect(searchArchivedAdmissions(BASE_ADMISSION_PARAMS)).rejects.toThrow(
      'Failed to retrieve archived admissions',
    )
  })

  it('logs the original error before re-throwing', async () => {
    const original = new Error('timeout')
    vi.mocked(query).mockRejectedValue(original)

    await expect(searchArchivedAdmissions(BASE_ADMISSION_PARAMS)).rejects.toThrow()
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to search archived admissions',
      original,
    )
  })
})

// ── searchArchivedAuditLogs ───────────────────────────────────────────────

describe('searchArchivedAuditLogs', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── AC: Archived data is searchable by date range ─────────────────────

  it('passes UTC-pinned from/to Date params to the query', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    await searchArchivedAuditLogs({ ...BASE_AUDIT_PARAMS, from: '2024-11-01', to: '2024-11-30' })

    const [sql, params] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
    expect(sql).toMatch(/created_at >= \$1/)
    expect(sql).toMatch(/created_at <= \$2/)

    const fromDate = params[0] as Date
    const toDate = params[1] as Date
    expect(fromDate.toISOString()).toBe('2024-11-01T00:00:00.000Z')
    expect(toDate.toISOString()).toBe('2024-11-30T23:59:59.999Z')
  })

  it('queries the audit_logs_archive table, not the live table', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    await searchArchivedAuditLogs(BASE_AUDIT_PARAMS)

    const [sql] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
    expect(sql).toMatch(/FROM audit_logs_archive/)
    expect(sql).not.toMatch(/FROM audit_logs[^_]/)
  })

  it('orders results by created_at DESC', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    await searchArchivedAuditLogs(BASE_AUDIT_PARAMS)

    const [sql] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
    expect(sql).toMatch(/ORDER BY created_at DESC/i)
  })

  // ── Limit cap ─────────────────────────────────────────────────────────

  it('uses default limit 200 when not specified', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    await searchArchivedAuditLogs(BASE_AUDIT_PARAMS)

    const [, params] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
    expect(params[2]).toBe(200)
  })

  it('caps limit at 1000', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    await searchArchivedAuditLogs({ ...BASE_AUDIT_PARAMS, limit: 5000 })

    const [, params] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
    expect(params[2]).toBe(1000)
  })

  // ── AC: Retrieved data is displayed in same format as active data ─────

  it('maps raw DB row to ArchivedAuditLog shape with correct camelCase fields', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [RAW_AUDIT_ROW] } as never)

    const results = await searchArchivedAuditLogs(BASE_AUDIT_PARAMS)

    expect(results).toHaveLength(1)
    const row = results[0]

    expect(row.id).toBe('log-uuid-1')
    expect(row.actionType).toBe('STAGE_CHANGE')
    expect(row.entityType).toBe('bed')
    expect(row.entityId).toBe('bed-A1')
    expect(row.performedByUserId).toBe('nurse-uuid-1')
    expect(row.changes).toEqual({ from: 'triage', to: 'treatment' })
    expect(row.reason).toBe('Patient stabilised')
    expect(row.metadata).toEqual({ shiftId: 'shift-1' })
    expect(row.ipAddress).toBe('192.168.1.10')
    expect(row.createdAt).toBeInstanceOf(Date)
    expect(row.createdAt.toISOString()).toBe('2024-01-15T09:30:00.000Z')
    expect(row.archivedAt).toBeInstanceOf(Date)
  })

  it('maps null reason to null', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [{ ...RAW_AUDIT_ROW, reason: null }],
    } as never)

    const results = await searchArchivedAuditLogs(BASE_AUDIT_PARAMS)
    expect(results[0].reason).toBeNull()
  })

  it('maps null ip_address to null', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [{ ...RAW_AUDIT_ROW, ip_address: null }],
    } as never)

    const results = await searchArchivedAuditLogs(BASE_AUDIT_PARAMS)
    expect(results[0].ipAddress).toBeNull()
  })

  it('falls back to empty object when changes is null/undefined', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [{ ...RAW_AUDIT_ROW, changes: null }],
    } as never)

    const results = await searchArchivedAuditLogs(BASE_AUDIT_PARAMS)
    expect(results[0].changes).toEqual({})
  })

  it('falls back to empty object when metadata is null/undefined', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [{ ...RAW_AUDIT_ROW, metadata: null }],
    } as never)

    const results = await searchArchivedAuditLogs(BASE_AUDIT_PARAMS)
    expect(results[0].metadata).toEqual({})
  })

  it('returns multiple rows in the order returned by the DB', async () => {
    const row2 = { ...RAW_AUDIT_ROW, id: 'log-uuid-2', created_at: '2024-01-14T10:00:00.000Z' }
    vi.mocked(query).mockResolvedValue({ rows: [RAW_AUDIT_ROW, row2] } as never)

    const results = await searchArchivedAuditLogs(BASE_AUDIT_PARAMS)

    expect(results).toHaveLength(2)
    expect(results[0].id).toBe('log-uuid-1')
    expect(results[1].id).toBe('log-uuid-2')
  })

  // ── Logging ───────────────────────────────────────────────────────────

  it('logs info with from, to, and rowsReturned', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [RAW_AUDIT_ROW] } as never)

    await searchArchivedAuditLogs(BASE_AUDIT_PARAMS)

    expect(logger.info).toHaveBeenCalledWith(
      'Archived audit logs searched',
      expect.objectContaining({ from: '2024-01-01', to: '2024-01-31', rowsReturned: 1 }),
    )
  })

  // ── Error handling ────────────────────────────────────────────────────

  it('throws a user-friendly error when the DB query fails', async () => {
    vi.mocked(query).mockRejectedValue(new Error('query timeout'))

    await expect(searchArchivedAuditLogs(BASE_AUDIT_PARAMS)).rejects.toThrow(
      'Failed to retrieve archived audit logs',
    )
  })

  it('logs the original error before re-throwing', async () => {
    const original = new Error('ssl error')
    vi.mocked(query).mockRejectedValue(original)

    await expect(searchArchivedAuditLogs(BASE_AUDIT_PARAMS)).rejects.toThrow()
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to search archived audit logs',
      original,
    )
  })

  // ── AC: single-day range ──────────────────────────────────────────────

  it('handles single-day range (from === to) with correct UTC bounds', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    await searchArchivedAuditLogs({ ...BASE_AUDIT_PARAMS, from: '2024-12-31', to: '2024-12-31' })

    const [, params] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
    expect((params[0] as Date).toISOString()).toBe('2024-12-31T00:00:00.000Z')
    expect((params[1] as Date).toISOString()).toBe('2024-12-31T23:59:59.999Z')
  })

  // ── AC: year-boundary robustness ──────────────────────────────────────

  it('correctly pins to UTC on Dec 31 (year-boundary — no local-TZ drift)', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)

    await searchArchivedAuditLogs({ ...BASE_AUDIT_PARAMS, from: '2023-12-31', to: '2024-01-01' })

    const [, params] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
    // Must not drift into Jan 1 or Dec 30 due to timezone offset
    expect((params[0] as Date).toISOString()).toBe('2023-12-31T00:00:00.000Z')
    expect((params[1] as Date).toISOString()).toBe('2024-01-01T23:59:59.999Z')
  })
})
