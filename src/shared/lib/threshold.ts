import 'server-only'
// US-6.3: Threshold resolution — single source of truth for delay thresholds
// Reads from system_settings (global) and stage_delay_thresholds (per-stage override).
// EPIC 13: Global threshold is cached so the Dashboard doesn't pay a DB round-trip
// on every page load. Cache is invalidated when an admin writes a new value.
// US-15.3: Added Escalation Threshold for showing critical indicators

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { withCache, SETTINGS_CACHE_TAG, SETTINGS_CACHE_TTL_S } from './query-cache'

const DEFAULT_THRESHOLD_MINUTES = 180 // 3 hours fallback if DB unavailable
const DEFAULT_ESCALATION_MINUTES = 240 // 4 hours fallback for US-15.3

/**
 * Internal fetch — not exported. Call `getGlobalThresholdMinutes` instead.
 */
async function fetchGlobalThresholdMinutes(): Promise<number> {
  try {
    const result = await query<{ value: string }>(
      `SELECT value FROM system_settings WHERE key = 'delay_threshold_minutes'`,
      []
    )
    if (result.rows.length > 0) {
      return parseInt(result.rows[0].value, 10)
    }
  } catch (err) {
    logger.error('fetchGlobalThresholdMinutes failed, using default', err as Error)
  }
  return DEFAULT_THRESHOLD_MINUTES
}

/**
 * Internal fetch for escalation threshold.
 */
async function fetchGlobalEscalationThresholdMinutes(): Promise<number> {
  try {
    const result = await query<{ value: string }>(
      `SELECT value FROM system_settings WHERE key = 'escalation_threshold_minutes'`,
      []
    )
    if (result.rows.length > 0) {
      return parseInt(result.rows[0].value, 10)
    }
  } catch (err) {
    logger.error('fetchGlobalEscalationThresholdMinutes failed, using default', err as Error)
  }
  return DEFAULT_ESCALATION_MINUTES
}

/**
 * Returns the global delay threshold in minutes.
 * Result is cached for 120 s to avoid a DB hit on every dashboard load.
 * Invalidated by `setGlobalThresholdAction` via `revalidateTag`.
 */
export const getGlobalThresholdMinutes = withCache(
  fetchGlobalThresholdMinutes,
  'global-threshold-minutes',
  SETTINGS_CACHE_TTL_S,
  [SETTINGS_CACHE_TAG],
)

/**
 * Returns the global escalation threshold in minutes.
 * Result is cached for 120 s to avoid a DB hit on every dashboard load.
 */
export const getGlobalEscalationThresholdMinutes = withCache(
  fetchGlobalEscalationThresholdMinutes,
  'global-escalation-threshold-minutes',
  SETTINGS_CACHE_TTL_S,
  [SETTINGS_CACHE_TAG],
)

/**
 * Returns the global delay threshold in milliseconds.
 */
export async function getGlobalThresholdMs(): Promise<number> {
  const minutes = await getGlobalThresholdMinutes()
  return minutes * 60 * 1000
}

/**
 * Returns the global escalation threshold in milliseconds.
 */
export async function getGlobalEscalationThresholdMs(): Promise<number> {
  const minutes = await getGlobalEscalationThresholdMinutes()
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
