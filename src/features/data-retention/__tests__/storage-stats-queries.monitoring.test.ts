import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/db', () => ({
    query: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { fetchStorageStats } from '../lib/storage-stats-queries'

const RAW_TABLE_ROWS = [
    { table_name: 'audit_logs', total_bytes: '2097152', pretty_size: '2048 kB' },
    { table_name: 'patient_admissions', total_bytes: '1048576', pretty_size: '1024 kB' },
    { table_name: 'patient_admissions_archive', total_bytes: '524288', pretty_size: '512 kB' },
    { table_name: 'audit_logs_archive', total_bytes: '262144', pretty_size: '256 kB' },
    { table_name: 'bed_stage_logs', total_bytes: '786432', pretty_size: '768 kB' },
    { table_name: 'archival_runs', total_bytes: '131072', pretty_size: '128 kB' },
]

const RAW_DB_SIZE_ROW = { db_bytes: '5368709120' }

function mockAllQueries(opts: { tableRows?: any[], dbBytes?: string, thresholdValue?: string | null }) {
    const { tableRows = RAW_TABLE_ROWS, dbBytes = RAW_DB_SIZE_ROW.db_bytes, thresholdValue = '10' } = opts
    let callCount = 0
    vi.mocked(query).mockImplementation(() => {
        const call = callCount++
        if (call === 0) return Promise.resolve({ rows: tableRows }) as never
        if (call === 1) return Promise.resolve({ rows: [{ db_bytes: dbBytes }] }) as never
        if (thresholdValue === null) return Promise.resolve({ rows: [] }) as never
        return Promise.resolve({ rows: [{ value: thresholdValue }] }) as never
    })
}

describe('fetchStorageStats — Monitoring', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns a table entry for each monitored table', async () => {
        mockAllQueries({})
        const stats = await fetchStorageStats()
        expect(stats.tables).toHaveLength(6)
        expect(stats.tables.map(t => t.tableName)).toContain('patient_admissions')
    })

    it('converts totalBytes from string to number', async () => {
        mockAllQueries({})
        const stats = await fetchStorageStats()
        stats.tables.forEach(t => expect(typeof t.totalBytes).toBe('number'))
    })

    it('preserves prettySize string from DB', async () => {
        mockAllQueries({})
        const stats = await fetchStorageStats()
        const auditRow = stats.tables.find(t => t.tableName === 'audit_logs')
        expect(auditRow?.prettySize).toBe('2048 kB')
    })

    it('converts totalDatabaseBytes from string to number and formats prettyTotal', async () => {
        mockAllQueries({ dbBytes: '5368709120' })
        const stats = await fetchStorageStats()
        expect(stats.totalDatabaseBytes).toBe(5_368_709_120)
        expect(stats.prettyTotal).toBe('5.00 GB')
    })

    it('includes a sampledAt Date close to now', async () => {
        mockAllQueries({})
        const stats = await fetchStorageStats()
        expect(stats.sampledAt).toBeInstanceOf(Date)
        expect(Math.abs(stats.sampledAt.getTime() - Date.now())).toBeLessThan(1000)
    })

    it('queries pg_total_relation_size and pg_database_size', async () => {
        mockAllQueries({})
        await fetchStorageStats()
        const calls = vi.mocked(query).mock.calls.map(([sql]) => sql as string)
        expect(calls.some(sql => sql.includes('pg_total_relation_size'))).toBe(true)
        expect(calls.some(sql => sql.includes('pg_database_size'))).toBe(true)
    })

    it('handles zero monitored tables without error', async () => {
        let callCount = 0
        vi.mocked(query).mockImplementation(() => {
            const call = callCount++
            if (call === 0) return Promise.resolve({ rows: [] }) as never
            if (call === 1) return Promise.resolve({ rows: [{ db_bytes: '0' }] }) as never
            return Promise.resolve({ rows: [{ value: '10' }] }) as never
        })
        const stats = await fetchStorageStats()
        expect(stats.tables).toEqual([])
        expect(stats.totalDatabaseBytes).toBe(0)
    })

    it('logs info on success', async () => {
        mockAllQueries({})
        await fetchStorageStats()
        expect(logger.info).toHaveBeenCalledWith('Storage stats fetched', expect.anything())
    })
})
