// DB5-02: Raw SQL queries for user_settings table
// These are consumed by user-settings-actions.ts (server actions)

import 'server-only'
import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { UserPreferences } from '@/shared/types/user-preferences.types'
import { DEFAULT_USER_PREFERENCES } from '@/shared/types/user-preferences.types'

/**
 * Fetch the stored preferences for a user.
 * If no row exists, returns DEFAULT_USER_PREFERENCES.
 * Merges defaults so that any new keys added in future are always present.
 */
export async function selectUserPreferences(userId: string): Promise<UserPreferences> {
  try {
    const { rows } = await pool.query<{ preferences: Partial<UserPreferences> }>(
      'SELECT preferences FROM user_settings WHERE user_id = $1',
      [userId]
    )

    if (rows.length === 0) {
      return { ...DEFAULT_USER_PREFERENCES }
    }

    // Merge stored values over defaults — new keys added later always have a value
    return { ...DEFAULT_USER_PREFERENCES, ...rows[0].preferences }
  } catch (error) {
    logger.error('Failed to fetch user preferences', error as Error, { userId })
    // Fail open — return defaults so the UI is never blocked
    return { ...DEFAULT_USER_PREFERENCES }
  }
}

/**
 * Upsert a partial preference patch for a user.
 * Uses JSONB merge (`||`) so only the keys in `patch` are updated;
 * all other stored keys are preserved.
 */
export async function upsertUserPreferences(
  userId: string,
  patch: Partial<UserPreferences>
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO user_settings (user_id, preferences, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         preferences = user_settings.preferences || $2::jsonb,
         updated_at  = NOW()`,
      [userId, JSON.stringify(patch)]
    )
  } catch (error) {
    logger.error('Failed to upsert user preferences', error as Error, { userId, patch })
    // Non-fatal — preference writes should never crash the app
  }
}
