import 'server-only'

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { SETTINGS_CACHE_TAG, SETTINGS_CACHE_TTL_S, withCache } from './query-cache'

type SystemSettingEntry = [string, string]

async function fetchAllSystemSettingEntriesFromDb(): Promise<SystemSettingEntry[]> {
  try {
    const result = await query<{ key: string; value: string }>(
      'SELECT key, value FROM system_settings',
      []
    )

    return result.rows.map((row) => [row.key, row.value])
  } catch (err) {
    logger.error('fetchAllSystemSettingEntriesFromDb failed', err as Error)
    return []
  }
}

const getCachedSystemSettingEntries = withCache(
  fetchAllSystemSettingEntriesFromDb,
  'system-settings:all',
  SETTINGS_CACHE_TTL_S,
  [SETTINGS_CACHE_TAG],
)

export async function getAllSystemSettings(): Promise<Map<string, string>> {
  return new Map(await getCachedSystemSettingEntries())
}
