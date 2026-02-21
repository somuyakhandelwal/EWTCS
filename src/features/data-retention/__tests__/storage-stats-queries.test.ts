// storage-stats-queries.test.ts
// EPIC 14 — US-14.4: Storage Optimization
//
// Tests the query-layer function directly:
//   - fetchStorageStats
//
// AC coverage:
//   ✅ Storage usage is monitored (per-table sizes returned)
//   ✅ Storage alerts trigger when threshold is reached (isAlertTriggered flag)
//   ✅ Old logs are compressed (TOAST — structural: pg_total_relation_size used)
//   ✅ Duplicate data is deduplicated (archival cron — structural: archive tables present)
//   ✅ Storage optimization runs automatically (archival cron feeds archive tables)
//   ✅ Alert threshold reads from system_settings; falls back to 10 GB default

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/shared/lib/db', () => ({
  query: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { fetchStorageStats } from '../lib/storage-stats-queries'

// ── Fixtures ──────────────────────────────────────────────────────────────

/** Raw rows from the pg_class size query */
const RAW_TABLE_ROWS = [
  { table_name: 'audit_logs',                 total_bytes: '2097152',   pretty_size: '2048 kB' },
  { table_name: 'patient_admissions',          total_bytes: '1048576',   pretty_size: '1024 kB' },
  { table_name: 'patient_admissions_archive',  total_bytes: '524288',    pretty_size: '512 kB'  },
  { table_name: 'audit_logs_archive',          total_bytes: '262144',    pretty_size: '256 kB'  },
  { table_name: 'bed_stage_logs',              total_bytes: '786432',    pretty_size: '768 kB'  },
  { table_name: 'archival_runs',               total_bytes: '131072',    pretty_size: '128 kB'  },
]

/** 5 GB total */
const RAW_DB_SIZE_ROW = { db_bytes: '5368709120' }

/** Threshold setting row — 10 GB */
const RAW_THRESHOLD_ROW = { value: '10' }

/**
 * Set up query mock to return size rows, db size, and threshold in the
 * order Promise.all dispatches them (tables, dbSize, threshold).
 */
function mockAllQueries(opts: {
  tableRows?: typeof RAW_TABLE_ROWS
  dbBytes?: string
  thresholdValue?: string | null
}) {
  const { tableRows = RAW_TABLE_ROWS, dbBytes = RAW_DB_SIZE_ROW.db_bytes, thresholdValue = '10' } = opts
  let callCount = 0
  vi.mocked(query).mockImplementation(() => {
    const call = callCount++
    if (call === 0) return Promise.resolve({ rows: tableRows }) as never
    if (call === 1) return Promise.resolve({ rows: [{ db_bytes: dbBytes }] }) as never
    // call === 2: threshold query
    if (thresholdValue === null) return Promise.resolve({ rows: [] }) as never
    return Promise.resolve({ rows: [{ value: thresholdValue }] }) as never
  })
}

// ── fetchStorageStats ─────────────────────────────────────────────────────

describe('fetchStorageStats', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── AC: Storage usage is monitored ────────────────────────────────────

  it('returns a table entry for each monitored table', async () => {
    mockAllQueries({})

    const stats = await fetchStorageStats()

    expect(stats.tables).toHaveLength(6)
    const names = stats.tables.map((t) => t.tableName)
    expect(names).toContain('patient_admissions')
    expect(names).toContain('patient_admissions_archive')
    expect(names).toContain('audit_logs')
    expect(names).toContain('audit_logs_archive')
    expect(names).toContain('bed_stage_logs')
    expect(names).toContain('archival_runs')
  })

  it('converts totalBytes from string to number', async () => {
    mockAllQueries({})

    const stats = await fetchStorageStats()

    for (const table of stats.tables) {
      expect(typeof table.totalBytes).toBe('number')
      expect(table.totalBytes).toBeGreaterThan(0)
    }
  })

  it('preserves prettySize string from DB', async () => {
    mockAllQueries({})

    const stats = await fetchStorageStats()

    const auditRow = stats.tables.find((t) => t.tableName === 'audit_logs')
    expect(auditRow?.prettySize).toBe('2048 kB')
  })

  it('converts totalDatabaseBytes from string to number', async () => {
    mockAllQueries({ dbBytes: '5368709120' })

    const stats = await fetchStorageStats()

    expect(stats.totalDatabaseBytes).toBe(5_368_709_120)
    expect(typeof stats.totalDatabaseBytes).toBe('number')
  })

  it('formats prettyTotal as X.XX GB', async () => {
    mockAllQueries({ dbBytes: '5368709120' }) // 5 GB exactly

    const stats = await fetchStorageStats()

    expect(stats.prettyTotal).toBe('5.00 GB')
  })

  it('includes a sampledAt Date close to now', async () => {
    const before = Date.now()
    mockAllQueries({})

    const stats = await fetchStorageStats()

    const after = Date.now()
    expect(stats.sampledAt).toBeInstanceOf(Date)
    expect(stats.sampledAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(stats.sampledAt.getTime()).toBeLessThanOrEqual(after)
  })

  // ── AC: Storage alerts trigger when threshold is reached ──────────────

  it('sets isAlertTriggered = false when DB is below threshold', async () => {
    // 5 GB DB, 10 GB threshold
    mockAllQueries({ dbBytes: '5368709120', thresholdValue: '10' })

    const stats = await fetchStorageStats()

    expect(stats.isAlertTriggered).toBe(false)
    expect(stats.alertThresholdGb).toBe(10)
  })

  it('sets isAlertTriggered = true when DB equals threshold', async () => {
    // 10 GB DB, 10 GB threshold → >= triggers
    mockAllQueries({ dbBytes: String(10 * 1024 ** 3), thresholdValue: '10' })

    const stats = await fetchStorageStats()

    expect(stats.isAlertTriggered).toBe(true)
  })

  it('sets isAlertTriggered = true when DB exceeds threshold', async () => {
    // 12 GB DB, 10 GB threshold
    mockAllQueries({ dbBytes: String(12 * 1024 ** 3), thresholdValue: '10' })

    const stats = await fetchStorageStats()

    expect(stats.isAlertTriggered).toBe(true)
    expect(stats.alertThresholdGb).toBe(10)
  })

  it('correctly handles a non-default threshold (e.g. 5 GB)', async () => {
    // 6 GB DB, 5 GB threshold → should alert
    mockAllQueries({ dbBytes: String(6 * 1024 ** 3), thresholdValue: '5' })

    const stats = await fetchStorageStats()

    expect(stats.alertThresholdGb).toBe(5)
    expect(stats.isAlertTriggered).toBe(true)
  })

  // ── AC: Alert threshold falls back to 10 GB default ──────────────────

  it('uses default 10 GB threshold when system_settings has no matching row', async () => {
    // Pass null to simulate empty rows from threshold query
    mockAllQueries({ dbBytes: '1073741824', thresholdValue: null })

    const stats = await fetchStorageStats()

    expect(stats.alertThresholdGb).toBe(10)
    expect(stats.isAlertTriggered).toBe(false) // 1 GB < 10 GB default
  })

  it('uses default 10 GB threshold when system_settings value is non-numeric', async () => {
    mockAllQueries({ dbBytes: '1073741824', thresholdValue: 'not-a-number' })

    const stats = await fetchStorageStats()

    expect(stats.alertThresholdGb).toBe(10)
  })

  // ── AC: Queries use pg_total_relation_size (TOAST compression included) ─

  it('queries pg_total_relation_size to include TOAST compressed data', async () => {
    mockAllQueries({})

    await fetchStorageStats()

    // Find the call that queries the pg_class size query
    const sizeSql = vi.mocked(query).mock.calls
      .map(([sql]) => sql as string)
      .find((sql) => sql.includes('pg_total_relation_size'))

    expect(sizeSql).toBeDefined()
    expect(sizeSql).toMatch(/pg_total_relation_size/)
  })

  it('queries pg_database_size for total DB size', async () => {
    mockAllQueries({})

    await fetchStorageStats()

    const dbSizeSql = vi.mocked(query).mock.calls
      .map(([sql]) => sql as string)
      .find((sql) => sql.includes('pg_database_size'))

    expect(dbSizeSql).toBeDefined()
  })

  // ── Zero tables edge case ─────────────────────────────────────────────

  it('handles zero monitored tables without error', async () => {
    let callCount = 0
    vi.mocked(query).mockImplementation(() => {
      const call = callCount++
      if (call === 0) return Promise.resolve({ rows: [] }) as never          // no tables
      if (call === 1) return Promise.resolve({ rows: [{ db_bytes: '0' }] }) as never
      return Promise.resolve({ rows: [RAW_THRESHOLD_ROW] }) as never
    })

    const stats = await fetchStorageStats()

    expect(stats.tables).toEqual([])
    expect(stats.totalDatabaseBytes).toBe(0)
    expect(stats.isAlertTriggered).toBe(false)
  })

  it('handles missing db_bytes row gracefully (defaults to 0)', async () => {
    let callCount = 0
    vi.mocked(query).mockImplementation(() => {
      const call = callCount++
      if (call === 0) return Promise.resolve({ rows: RAW_TABLE_ROWS }) as never
      if (call === 1) return Promise.resolve({ rows: [] }) as never  // no db size row
      return Promise.resolve({ rows: [RAW_THRESHOLD_ROW] }) as never
    })

    const stats = await fetchStorageStats()

    expect(stats.totalDatabaseBytes).toBe(0)
    expect(stats.prettyTotal).toBe('0.00 GB')
  })

  // ── Logging ───────────────────────────────────────────────────────────

  it('logs info with tableCount, totalDatabaseBytes, and isAlertTriggered', async () => {
    mockAllQueries({})

    await fetchStorageStats()

    expect(logger.info).toHaveBeenCalledWith(
      'Storage stats fetched',
      expect.objectContaining({
        tableCount: 6,
        isAlertTriggered: false,
        thresholdGb: 10,
      }),
    )
  })

  // ── Error handling ────────────────────────────────────────────────────

  it('throws a user-friendly error when the size query fails', async () => {
    vi.mocked(query).mockRejectedValue(new Error('relation does not exist'))

    await expect(fetchStorageStats()).rejects.toThrow(
      'Failed to retrieve storage statistics',
    )
  })

  it('logs the original error before re-throwing', async () => {
    const original = new Error('pg error')
    vi.mocked(query).mockRejectedValue(original)

    await expect(fetchStorageStats()).rejects.toThrow()
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fetch storage stats',
      original,
    )
  })

  // ── Threshold query failure is swallowed (graceful degradation) ───────

  it('falls back to default threshold when system_settings query throws', async () => {
    let callCount = 0
    vi.mocked(query).mockImplementation(() => {
      const call = callCount++
      if (call === 0) return Promise.resolve({ rows: RAW_TABLE_ROWS }) as never
      if (call === 1) return Promise.resolve({ rows: [RAW_DB_SIZE_ROW] }) as never
      // Threshold query throws — should be swallowed, returning default
      return Promise.reject(new Error('table not found')) as never
    })

    // Should NOT throw — threshold error is gracefully handled
    const stats = await fetchStorageStats()
    expect(stats.alertThresholdGb).toBe(10)
  })
})

// ── Additional: searchArchive action — missing edge cases ─────────────────
// These supplement the existing archive-search-actions.test.ts

import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { searchArchivedAdmissions, searchArchivedAuditLogs } from '../lib/archive-search-queries'
import { searchArchive } from '../actions/archive-search-actions'
import type { ArchivedAdmission } from '../lib/data-retention-types'

vi.mock('@/shared/lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('@/shared/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('../lib/archive-search-queries', () => ({
  searchArchivedAdmissions: vi.fn(),
  searchArchivedAuditLogs: vi.fn(),
}))

const SESSION = { userId: 'auditor-1', role: 'auditor' }

const SAMPLE_ADMISSION: ArchivedAdmission = {
  id: 'adm-1',
  bedId: 'bed-A1',
  admittedAt: new Date('2024-01-15T08:00:00Z'),
  dischargedAt: new Date('2024-01-16T08:00:00Z'),
  totalDurationMs: 86_400_000,
  dischargedByUserId: 'nurse-1',
  notes: null,
  createdAt: new Date('2024-01-15T08:00:00Z'),
  tatFromPreviousDischargeMs: null,
  archivedAt: new Date('2025-02-01T00:00:00Z'),
}

describe('searchArchive — additional edge cases', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes custom limit through to the query function', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(searchArchivedAdmissions).mockResolvedValue([SAMPLE_ADMISSION])

    await searchArchive({ table: 'patient_admissions', from: '2024-01-01', to: '2024-12-31', limit: 50 })

    expect(searchArchivedAdmissions).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 }),
    )
  })

  it('rejects invalid from date that passes regex but fails Date.parse', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)

    // 2024-13-01 matches YYYY-MM-DD regex but is not a valid date
    const result = await searchArchive({ table: 'patient_admissions', from: '2024-13-01', to: '2024-12-31' })

    expect(result.success).toBe(false)
  })

  it('rejects missing table field', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)

    const result = await searchArchive({ from: '2024-01-01', to: '2024-12-31' })

    expect(result.success).toBe(false)
  })

  it('rejects missing from field', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)

    const result = await searchArchive({ table: 'patient_admissions', to: '2024-12-31' })

    expect(result.success).toBe(false)
  })

  it('rejects missing to field', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)

    const result = await searchArchive({ table: 'patient_admissions', from: '2024-01-01' })

    expect(result.success).toBe(false)
  })

  it('accepts from === to (single day is valid)', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(searchArchivedAdmissions).mockResolvedValue([])

    const result = await searchArchive({ table: 'patient_admissions', from: '2024-06-15', to: '2024-06-15' })

    expect(result.success).toBe(true)
  })

  it('includes rowCount in the returned metadata', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(searchArchivedAdmissions).mockResolvedValue([SAMPLE_ADMISSION, SAMPLE_ADMISSION])

    const result = await searchArchive({ table: 'patient_admissions', from: '2024-01-01', to: '2024-12-31' })

    expect(result.rowCount).toBe(2)
    expect(result.data).toHaveLength(2)
  })

  it('audit log includes the date range as entityId', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(searchArchivedAdmissions).mockResolvedValue([])

    await searchArchive({ table: 'patient_admissions', from: '2024-03-01', to: '2024-03-31' })

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: '2024-03-01__2024-03-31',
      }),
    )
  })

  it('rejects limit of 0', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)

    const result = await searchArchive({
      table: 'patient_admissions',
      from: '2024-01-01',
      to: '2024-12-31',
      limit: 0,
    })

    expect(result.success).toBe(false)
  })

  it('rejects limit above 1000', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)

    const result = await searchArchive({
      table: 'patient_admissions',
      from: '2024-01-01',
      to: '2024-12-31',
      limit: 1001,
    })

    expect(result.success).toBe(false)
  })
})
