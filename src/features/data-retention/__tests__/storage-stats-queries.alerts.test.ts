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

function mockAllQueries(opts: { tableRows?: any[], dbBytes?: string, thresholdValue?: string | null }) {
    const { tableRows = [], dbBytes = '0', thresholdValue = '10' } = opts
    let callCount = 0
    vi.mocked(query).mockImplementation(() => {
        const call = callCount++
        if (call === 0) return Promise.resolve({ rows: tableRows }) as never
        if (call === 1) return Promise.resolve({ rows: [{ db_bytes: dbBytes }] }) as never
        if (thresholdValue === null) return Promise.resolve({ rows: [] }) as never
        return Promise.resolve({ rows: [{ value: thresholdValue }] }) as never
    })
}

describe('fetchStorageStats — Alerts & Errors', () => {
    beforeEach(() => vi.clearAllMocks())

    it('sets isAlertTriggered = false when DB is below threshold', async () => {
        mockAllQueries({ dbBytes: '5368709120', thresholdValue: '10' }) // 5 GB < 10 GB
        const stats = await fetchStorageStats()
        expect(stats.isAlertTriggered).toBe(false)
        expect(stats.alertThresholdGb).toBe(10)
    })

    it('sets isAlertTriggered = true when DB equals or exceeds threshold', async () => {
        mockAllQueries({ dbBytes: String(10 * 1024 ** 3), thresholdValue: '10' })
        let stats = await fetchStorageStats()
        expect(stats.isAlertTriggered).toBe(true)

        mockAllQueries({ dbBytes: String(12 * 1024 ** 3), thresholdValue: '10' })
        stats = await fetchStorageStats()
        expect(stats.isAlertTriggered).toBe(true)
    })

    it('respects custom threshold and fallback defaults', async () => {
        mockAllQueries({ dbBytes: String(6 * 1024 ** 3), thresholdValue: '5' })
        let stats = await fetchStorageStats()
        expect(stats.alertThresholdGb).toBe(5)

        mockAllQueries({ dbBytes: '1073741824', thresholdValue: null })
        stats = await fetchStorageStats()
        expect(stats.alertThresholdGb).toBe(10)

        mockAllQueries({ dbBytes: '1073741824', thresholdValue: 'invalid' })
        stats = await fetchStorageStats()
        expect(stats.alertThresholdGb).toBe(10)
    })

    it('throws user-friendly error when size query fails and logs it', async () => {
        const original = new Error('pg error')
        vi.mocked(query).mockRejectedValue(original)
        await expect(fetchStorageStats()).rejects.toThrow('Failed to retrieve storage statistics')
        expect(logger.error).toHaveBeenCalledWith('Failed to fetch storage stats', original)
    })

    it('gracefully handles threshold query failure', async () => {
        let callCount = 0
        vi.mocked(query).mockImplementation(() => {
            const call = callCount++
            if (call === 0) return Promise.resolve({ rows: [] }) as never
            if (call === 1) return Promise.resolve({ rows: [{ db_bytes: '0' }] }) as never
            return Promise.reject(new Error('no settings table')) as never
        })
        const stats = await fetchStorageStats()
        expect(stats.alertThresholdGb).toBe(10)
    })
})
