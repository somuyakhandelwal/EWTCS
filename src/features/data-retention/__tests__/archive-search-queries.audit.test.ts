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
    searchArchivedAuditLogs,
} from '../lib/archive-search-queries'
import type { ArchiveSearchParams } from '../lib/data-retention-types'

import { RAW_AUDIT_ROW } from './archive-fixtures'


const BASE_AUDIT_PARAMS: ArchiveSearchParams = {
    table: 'audit_logs',
    from: '2024-01-01',
    to: '2024-01-31',
}

// ── searchArchivedAuditLogs ───────────────────────────────────────────────

describe('searchArchivedAuditLogs', () => {
    beforeEach(() => vi.clearAllMocks())

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

    it('returns multiple rows in correct order', async () => {
        const row2 = { ...RAW_AUDIT_ROW, id: 'log-uuid-2', created_at: '2024-01-14T10:00:00.000Z' }
        vi.mocked(query).mockResolvedValue({ rows: [RAW_AUDIT_ROW, row2] } as never)

        const results = await searchArchivedAuditLogs(BASE_AUDIT_PARAMS)

        expect(results).toHaveLength(2)
        expect(results[0].id).toBe('log-uuid-1')
        expect(results[1].id).toBe('log-uuid-2')
    })

    it('logs info with from, to, and rowsReturned', async () => {
        vi.mocked(query).mockResolvedValue({ rows: [RAW_AUDIT_ROW] } as never)

        await searchArchivedAuditLogs(BASE_AUDIT_PARAMS)

        expect(logger.info).toHaveBeenCalledWith(
            'Archived audit logs searched',
            expect.objectContaining({ from: '2024-01-01', to: '2024-01-31', rowsReturned: 1 }),
        )
    })

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

    it('handles single-day range correctly', async () => {
        vi.mocked(query).mockResolvedValue({ rows: [] } as never)

        await searchArchivedAuditLogs({ ...BASE_AUDIT_PARAMS, from: '2024-12-31', to: '2024-12-31' })

        const [, params] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
        expect((params[0] as Date).toISOString()).toBe('2024-12-31T00:00:00.000Z')
        expect((params[1] as Date).toISOString()).toBe('2024-12-31T23:59:59.999Z')
    })

    it('correctly pins to UTC on Dec 31 (year-boundary)', async () => {
        vi.mocked(query).mockResolvedValue({ rows: [] } as never)

        await searchArchivedAuditLogs({ ...BASE_AUDIT_PARAMS, from: '2023-12-31', to: '2024-01-01' })

        const [, params] = vi.mocked(query).mock.calls[0] as [string, unknown[]]
        expect((params[0] as Date).toISOString()).toBe('2023-12-31T00:00:00.000Z')
        expect((params[1] as Date).toISOString()).toBe('2024-01-01T23:59:59.999Z')
    })
})
