// archive-search-actions.test.ts
// EPIC 14 — US-14.3: Auditor Archive Retrieval
// Verifies searchArchive server action behaviour.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@/shared/lib/audit', () => ({
  logAudit: vi.fn(),
}))

vi.mock('../lib/archive-search-queries', () => ({
  searchArchivedAdmissions: vi.fn(),
  searchArchivedAuditLogs: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { searchArchivedAdmissions, searchArchivedAuditLogs } from '../lib/archive-search-queries'
import { searchArchive } from '../actions/archive-search-actions'
import type { ArchivedAdmission, ArchivedAuditLog } from '../lib/data-retention-types'

const SESSION = { userId: 'auditor-1', role: 'auditor' }
const ADMIN_SESSION = { userId: 'admin-1', role: 'admin' }

const SAMPLE_ADMISSION: ArchivedAdmission = {
  id: 'adm-1',
  bedId: 'bed-1',
  admittedAt: new Date('2024-01-01T08:00:00Z'),
  dischargedAt: new Date('2024-01-02T08:00:00Z'),
  totalDurationMs: 86_400_000,
  dischargedByUserId: 'nurse-1',
  notes: null,
  createdAt: new Date('2024-01-01T08:00:00Z'),
  tatFromPreviousDischargeMs: null,
  archivedAt: new Date('2025-02-01T00:00:00Z'),
}

const SAMPLE_AUDIT_LOG: ArchivedAuditLog = {
  id: 'log-1',
  actionType: 'UPDATE',
  entityType: 'bed',
  entityId: 'bed-1',
  performedByUserId: 'nurse-1',
  changes: {},
  reason: null,
  metadata: {},
  ipAddress: null,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  archivedAt: new Date('2025-02-01T00:00:00Z'),
}

describe('searchArchive', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Role enforcement ─────────────────────────────────────────────────────

  it('calls requireRole with admin and auditor', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(searchArchivedAdmissions).mockResolvedValue([])

    await searchArchive({ table: 'patient_admissions', from: '2024-01-01', to: '2024-12-31' })

    expect(requireRole).toHaveBeenCalledWith(['admin', 'auditor'])
  })

  it('returns error when requireRole throws', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))

    const result = await searchArchive({ table: 'patient_admissions', from: '2024-01-01', to: '2024-12-31' })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unauthorized')
  })

  // ── Validation ───────────────────────────────────────────────────────────

  it('rejects invalid table name', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)

    const result = await searchArchive({ table: 'bad_table', from: '2024-01-01', to: '2024-12-31' })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects non-date from string', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)

    const result = await searchArchive({ table: 'patient_admissions', from: 'not-a-date', to: '2024-12-31' })

    expect(result.success).toBe(false)
  })

  it('rejects from > to', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)

    const result = await searchArchive({ table: 'patient_admissions', from: '2024-12-31', to: '2024-01-01' })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/from.*after.*to/i)
  })

  // ── Patient admissions ───────────────────────────────────────────────────

  it('returns archived admissions for admin', async () => {
    vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
    vi.mocked(searchArchivedAdmissions).mockResolvedValue([SAMPLE_ADMISSION])

    const result = await searchArchive({ table: 'patient_admissions', from: '2024-01-01', to: '2024-12-31' })

    expect(result.success).toBe(true)
    expect(result.table).toBe('patient_admissions')
    expect(result.rowCount).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(searchArchivedAdmissions).toHaveBeenCalledOnce()
    expect(searchArchivedAuditLogs).not.toHaveBeenCalled()
  })

  it('returns empty array when no archived admissions exist in range', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(searchArchivedAdmissions).mockResolvedValue([])

    const result = await searchArchive({ table: 'patient_admissions', from: '2020-01-01', to: '2020-01-02' })

    expect(result.success).toBe(true)
    expect(result.rowCount).toBe(0)
  })

  // ── Audit logs ───────────────────────────────────────────────────────────

  it('routes to audit logs query when table = audit_logs', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(searchArchivedAuditLogs).mockResolvedValue([SAMPLE_AUDIT_LOG])

    const result = await searchArchive({ table: 'audit_logs', from: '2024-01-01', to: '2024-12-31' })

    expect(result.success).toBe(true)
    expect(result.table).toBe('audit_logs')
    expect(searchArchivedAuditLogs).toHaveBeenCalledOnce()
    expect(searchArchivedAdmissions).not.toHaveBeenCalled()
  })

  // ── Audit logging ────────────────────────────────────────────────────────

  it('calls logAudit with ARCHIVE_READ on success', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(searchArchivedAdmissions).mockResolvedValue([SAMPLE_ADMISSION])

    await searchArchive({ table: 'patient_admissions', from: '2024-01-01', to: '2024-12-31' })

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'ARCHIVE_READ',
        entityType: 'patient_admissions',
        performedBy: SESSION.userId,
      }),
    )
  })

  it('does not call logAudit when validation fails', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)

    await searchArchive({ table: 'patient_admissions', from: 'bad', to: '2024-12-31' })

    expect(logAudit).not.toHaveBeenCalled()
  })

  // ── Query errors ─────────────────────────────────────────────────────────

  it('returns error when query throws', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(searchArchivedAdmissions).mockRejectedValue(new Error('DB down'))

    const result = await searchArchive({ table: 'patient_admissions', from: '2024-01-01', to: '2024-12-31' })

    expect(result.success).toBe(false)
    expect(result.error).toContain('DB down')
  })
})
