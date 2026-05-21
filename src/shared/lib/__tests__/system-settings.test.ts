import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Make cache wrapper transparent in unit tests.
vi.mock('@/shared/lib/query-cache', () => ({
  SETTINGS_CACHE_TAG: 'system-settings',
  SETTINGS_CACHE_TTL_S: 120,
  withCache: (fn: (...args: unknown[]) => Promise<unknown>) => fn,
}))

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { getAllSystemSettings } from '@/shared/lib/system-settings'

describe('getAllSystemSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a map of key/value settings', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        { key: 'los_target_minutes', value: '240' },
        { key: 'delay_target_pct', value: '20' },
      ],
    } as never)

    const result = await getAllSystemSettings()

    expect(result.get('los_target_minutes')).toBe('240')
    expect(result.get('delay_target_pct')).toBe('20')
  })

  it('returns empty map on db failure', async () => {
    const err = new Error('db unavailable')
    vi.mocked(query).mockRejectedValue(err)

    const result = await getAllSystemSettings()

    expect(result.size).toBe(0)
    expect(logger.error).toHaveBeenCalledWith('fetchAllSystemSettingEntriesFromDb failed', err)
  })
})
