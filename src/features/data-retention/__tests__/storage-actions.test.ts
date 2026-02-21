// storage-actions.test.ts
// EPIC 14 — US-14.4: Storage Optimization
// Verifies fetchStorageStatsAction server action behaviour.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('../lib/storage-stats-queries', () => ({
  fetchStorageStats: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import { fetchStorageStats } from '../lib/storage-stats-queries'
import { fetchStorageStatsAction } from '../actions/storage-actions'
import type { StorageStats } from '../lib/data-retention-types'

const SESSION = { userId: 'admin-1', role: 'admin' }
const AUDITOR_SESSION = { userId: 'auditor-1', role: 'auditor' }

const SAMPLE_STATS: StorageStats = {
  tables: [
    { tableName: 'patient_admissions', totalBytes: 1_048_576, prettySize: '1024 kB' },
    { tableName: 'patient_admissions_archive', totalBytes: 524_288, prettySize: '512 kB' },
    { tableName: 'audit_logs', totalBytes: 2_097_152, prettySize: '2048 kB' },
  ],
  totalDatabaseBytes: 5_368_709_120, // 5 GB
  prettyTotal: '5.00 GB',
  alertThresholdGb: 10,
  isAlertTriggered: false,
  sampledAt: new Date('2025-06-01T12:00:00Z'),
}

const OVER_THRESHOLD_STATS: StorageStats = {
  ...SAMPLE_STATS,
  totalDatabaseBytes: 12_884_901_888, // 12 GB
  prettyTotal: '12.00 GB',
  isAlertTriggered: true,
}

describe('fetchStorageStatsAction', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Role enforcement ─────────────────────────────────────────────────────

  it('calls requireRole with admin and auditor', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(fetchStorageStats).mockResolvedValue(SAMPLE_STATS)

    await fetchStorageStatsAction()

    expect(requireRole).toHaveBeenCalledWith(['admin', 'auditor'])
  })

  it('allows auditor role to fetch stats', async () => {
    vi.mocked(requireRole).mockResolvedValue(AUDITOR_SESSION as never)
    vi.mocked(fetchStorageStats).mockResolvedValue(SAMPLE_STATS)

    const result = await fetchStorageStatsAction()

    expect(result.success).toBe(true)
  })

  it('returns error when requireRole throws', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))

    const result = await fetchStorageStatsAction()

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unauthorized')
  })

  // ── Happy path ───────────────────────────────────────────────────────────

  it('returns storage stats on success', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(fetchStorageStats).mockResolvedValue(SAMPLE_STATS)

    const result = await fetchStorageStatsAction()

    expect(result.success).toBe(true)
    expect(result.data?.tables).toHaveLength(3)
    expect(result.data?.isAlertTriggered).toBe(false)
    expect(result.data?.prettyTotal).toBe('5.00 GB')
  })

  it('returns isAlertTriggered = true when DB exceeds threshold', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(fetchStorageStats).mockResolvedValue(OVER_THRESHOLD_STATS)

    const result = await fetchStorageStatsAction()

    expect(result.success).toBe(true)
    expect(result.data?.isAlertTriggered).toBe(true)
  })

  it('includes sampledAt timestamp in result', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(fetchStorageStats).mockResolvedValue(SAMPLE_STATS)

    const result = await fetchStorageStatsAction()

    expect(result.data?.sampledAt).toBeInstanceOf(Date)
  })

  // ── Error handling ───────────────────────────────────────────────────────

  it('returns error when fetchStorageStats throws', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(fetchStorageStats).mockRejectedValue(new Error('Connection refused'))

    const result = await fetchStorageStatsAction()

    expect(result.success).toBe(false)
    expect(result.error).toContain('Connection refused')
  })

  it('returns fallback error message for non-Error throws', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(fetchStorageStats).mockRejectedValue('unknown failure')

    const result = await fetchStorageStatsAction()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to fetch storage stats')
  })

  // ── Data shape ───────────────────────────────────────────────────────────

  it('returns correct table names', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(fetchStorageStats).mockResolvedValue(SAMPLE_STATS)

    const result = await fetchStorageStatsAction()

    const names = result.data?.tables.map((t) => t.tableName) ?? []
    expect(names).toContain('patient_admissions')
    expect(names).toContain('audit_logs')
  })

  it('each table has totalBytes and prettySize', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(fetchStorageStats).mockResolvedValue(SAMPLE_STATS)

    const result = await fetchStorageStatsAction()

    for (const table of result.data?.tables ?? []) {
      expect(typeof table.totalBytes).toBe('number')
      expect(typeof table.prettySize).toBe('string')
    }
  })
})
