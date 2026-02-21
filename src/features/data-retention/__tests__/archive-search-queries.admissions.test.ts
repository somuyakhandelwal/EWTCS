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
} from '../lib/archive-search-queries'
import type { ArchiveSearchParams } from '../lib/data-retention-types'

import { RAW_ADMISSION_ROW } from './archive-fixtures'


const BASE_ADMISSION_PARAMS: ArchiveSearchParams = {
    table: 'patient_admissions',
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

    it('handles single-day range (from === to) correctly', async () => {
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
