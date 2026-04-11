import 'server-only'

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { SETTINGS_CACHE_TAG, SETTINGS_CACHE_TTL_S, withCache } from './query-cache'

async function fetchAllSystemSettingsFromDb(): Promise<Map<string, string>> {
  try {
    const result = await query<{ key: string; value: string }>(
      'SELECT key, value FROM system_settings',
      []
    )

    return new Map(result.rows.map((row) => [row.key, row.value]))
  } catch (err) {
    logger.error('fetchAllSystemSettingsFromDb failed', err as Error)
    return new Map<string, string>()
  }
}

export const getAllSystemSettings = withCache(
  fetchAllSystemSettingsFromDb,
  'system-settings:all',
  SETTINGS_CACHE_TTL_S,
  [SETTINGS_CACHE_TAG],
)
