'use server'
// storage-actions.ts — server actions for US-14.4
// EPIC 14: Storage Optimization
//
// Fetches live PostgreSQL storage stats.
// Accessible to admin and auditor (read-only).
// Storage optimization itself is performed by the archival cron
// (api/cron/archival/route.ts) — see AC: "Storage optimization runs automatically".

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import { fetchStorageStats } from '../lib/storage-stats-queries'
import type { StorageStats } from '../lib/data-retention-types'

// ── Result types ──────────────────────────────────────────────────────────

export interface FetchStorageStatsResult {
  success: boolean
  data?: StorageStats
  error?: string
}

// ── Actions ───────────────────────────────────────────────────────────────

/**
 * Retrieve current storage statistics for monitored tables.
 * Returns an alert flag when total DB size exceeds the configured threshold.
 *
 * AC: "Storage usage is monitored" — this action is called on page load.
 * AC: "Storage alerts trigger when threshold is reached" — isAlertTriggered
 *     field in StorageStats reflects whether threshold has been crossed.
 * AC: "Old logs are compressed" — PostgreSQL TOAST compression is applied
 *     automatically to large text/jsonb columns; no manual step required.
 * AC: "Storage optimization runs automatically" — the archival cron at
 *     /api/cron/archival moves qualifying rows to archive tables on schedule.
 */
export async function fetchStorageStatsAction(): Promise<FetchStorageStatsResult> {
  try {
    await requireRole(['admin', 'auditor'])

    const data = await fetchStorageStats()

    if (data.isAlertTriggered) {
      logger.warn('Storage alert triggered', {
        totalGb: (data.totalDatabaseBytes / 1024 ** 3).toFixed(2),
        thresholdGb: data.alertThresholdGb,
      })
    }

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch storage stats'
    logger.error('fetchStorageStatsAction failed', error as Error)
    return { success: false, error: message }
  }
}
