import { describe, it, expect, vi, beforeEach } from 'vitest'
import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { fetchStorageStats } from '../lib/storage-stats-queries'
import { RAW_TABLE_ROWS, RAW_THRESHOLD_ROW, mockAllQueries } from './storage-stats-fixtures'

vi.mock('@/shared/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

describe('fetchStorageStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a table entry for each monitored table', async () => {
    mockAllQueries(query, {})
    const stats = await fetchStorageStats()
    expect(stats.tables).toHaveLength(6)
    expect(stats.tables.map(t => t.tableName)).toContain('patient_admissions')
  })

  it('converts totalBytes and dbBytes to numbers', async () => {
    mockAllQueries(query, { dbBytes: '5368709120' })
    const stats = await fetchStorageStats()
    expect(typeof stats.tables[0].totalBytes).toBe('number')
    expect(stats.totalDatabaseBytes).toBe(5_368_709_120)
  })

  it('formats prettyTotal as GB', async () => {
    mockAllQueries(query, { dbBytes: '5368709120' })
    const stats = await fetchStorageStats()
    expect(stats.prettyTotal).toBe('5.00 GB')
  })

  it('sets isAlertTriggered correctly based on threshold', async () => {
    mockAllQueries(query, { dbBytes: String(12 * 1024 ** 3), thresholdValue: '10' })
    const stats = await fetchStorageStats()
    expect(stats.isAlertTriggered).toBe(true)
    expect(stats.alertThresholdGb).toBe(10)
  })

  it('uses default 10 GB threshold fallback', async () => {
    mockAllQueries(query, { thresholdValue: null })
    const stats = await fetchStorageStats()
    expect(stats.alertThresholdGb).toBe(10)
  })

  it('queries pg_total_relation_size and pg_database_size', async () => {
    mockAllQueries(query, {})
    await fetchStorageStats()
    const sqls = vi.mocked(query).mock.calls.map(([sql]) => sql as string)
    expect(sqls.some(s => s.includes('pg_total_relation_size'))).toBe(true)
    expect(sqls.some(s => s.includes('pg_database_size'))).toBe(true)
  })

  it('handles zero tables or missing db_bytes row', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never)
    const stats = await fetchStorageStats()
    expect(stats.tables).toEqual([])
    expect(stats.totalDatabaseBytes).toBe(0)
  })

  it('logs success details', async () => {
    mockAllQueries(query, {})
    await fetchStorageStats()
    expect(logger.info).toHaveBeenCalledWith('Storage stats fetched', expect.objectContaining({ tableCount: 6 }))
  })

  it('throws and logs on query failure', async () => {
    const err = new Error('db down')
    vi.mocked(query).mockRejectedValue(err)
    await expect(fetchStorageStats()).rejects.toThrow('Failed to retrieve storage statistics')
    expect(logger.error).toHaveBeenCalledWith('Failed to fetch storage stats', err)
  })

  it('gracefully handles threshold query failure', async () => {
    let call = 0
    vi.mocked(query).mockImplementation(() => {
      if (call++ === 2) return Promise.reject(new Error('no table')) as never
      return Promise.resolve({ rows: call === 1 ? RAW_TABLE_ROWS : [{ db_bytes: '0' }] }) as never
    })
    const stats = await fetchStorageStats()
    expect(stats.alertThresholdGb).toBe(10)
  })
})
