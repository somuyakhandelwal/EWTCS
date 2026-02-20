import 'server-only'
// US-6.3: Threshold resolution — single source of truth for delay thresholds
// Reads from system_settings (global) and stage_delay_thresholds (per-stage override)

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

const DEFAULT_THRESHOLD_MINUTES = 180 // 3 hours fallback if DB unavailable

/**
 * Returns the global delay threshold in minutes from system_settings.
 * Falls back to 180 minutes (3 hours) if not configured.
 */
export async function getGlobalThresholdMinutes(): Promise<number> {
  try {
    const result = await query<{ value: string }>(
      `SELECT value FROM system_settings WHERE key = 'delay_threshold_minutes'`,
      []
    )
    if (result.rows.length > 0) {
      return parseInt(result.rows[0].value, 10)
    }
  } catch (err) {
    logger.error('getGlobalThresholdMinutes failed, using default', err as Error)
  }
  return DEFAULT_THRESHOLD_MINUTES
}

/**
 * Returns the global delay threshold in milliseconds.
 */
export async function getGlobalThresholdMs(): Promise<number> {
  const minutes = await getGlobalThresholdMinutes()
  return minutes * 60 * 1000
}

/**
 * Returns the effective threshold in minutes for a given stage.
 * Checks stage_delay_thresholds first, falls back to global.
 */
export async function getEffectiveThresholdMinutes(stageId?: string): Promise<number> {
  if (stageId) {
    try {
      const result = await query<{ threshold_minutes: number }>(
        `SELECT threshold_minutes FROM stage_delay_thresholds WHERE stage_id = $1`,
        [stageId]
      )
      if (result.rows.length > 0) {
        return result.rows[0].threshold_minutes
      }
    } catch (err) {
      logger.error('getEffectiveThresholdMinutes stage lookup failed', err as Error)
    }
  }
  return getGlobalThresholdMinutes()
}
