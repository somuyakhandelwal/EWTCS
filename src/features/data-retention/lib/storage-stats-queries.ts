// storage-stats-queries.ts — PostgreSQL storage monitoring
// EPIC 14 — US-14.4: Storage Optimization
//
// Reads live pg_total_relation_size stats so the admin/auditor
// can see how much space each monitored table is consuming.
// The alert threshold is stored in system_settings.

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { TableSizeInfo, StorageStats } from './data-retention-types'

// Tables we actively monitor for EPIC 14
const MONITORED_TABLES = [
  'patient_admissions',
  'patient_admissions_archive',
  'audit_logs',
  'audit_logs_archive',
  'bed_stage_logs',
  'archival_runs',
] as const

const DEFAULT_ALERT_THRESHOLD_GB = 10

// ── Internal row types ────────────────────────────────────────────────────

interface RawSizeRow {
  table_name: string
  total_bytes: string
  pretty_size: string
}

interface RawSettingRow {
  value: string
}

// ── Helpers ───────────────────────────────────────────────────────────────

function buildTableList(): string {
  return MONITORED_TABLES.map((t) => `'${t}'`).join(', ')
}

async function fetchAlertThresholdGb(): Promise<number> {
  try {
    const result = await query<RawSettingRow>(
      `SELECT value FROM system_settings WHERE key = 'storage_alert_threshold_gb' LIMIT 1`,
      [],
    )
    if (result.rows.length === 0) return DEFAULT_ALERT_THRESHOLD_GB
    const parsed = parseFloat(result.rows[0].value)
    return isNaN(parsed) ? DEFAULT_ALERT_THRESHOLD_GB : parsed
  } catch {
    return DEFAULT_ALERT_THRESHOLD_GB
  }
}

// ── Public query function ─────────────────────────────────────────────────

/**
 * Collect per-table sizes and total database size.
 * PostgreSQL TOAST automatically compresses large text columns, so
 * pg_total_relation_size (which includes TOAST) gives the true on-disk cost.
 *
 * Note: Auto-optimization is handled by the archival cron (api/cron/archival).
 * This function only reports current usage.
 */
export async function fetchStorageStats(): Promise<StorageStats> {
  const tableList = buildTableList()

  try {
    const [tablesResult, dbSizeResult, thresholdGb] = await Promise.all([
      query<RawSizeRow>(
        `SELECT
           relname                                   AS table_name,
           pg_total_relation_size(c.oid)             AS total_bytes,
           pg_size_pretty(pg_total_relation_size(c.oid)) AS pretty_size
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND c.relkind = 'r'
           AND c.relname IN (${tableList})
         ORDER BY pg_total_relation_size(c.oid) DESC`,
        [],
      ),
      query<{ db_bytes: string }>(
        `SELECT pg_database_size(current_database()) AS db_bytes`,
        [],
      ),
      fetchAlertThresholdGb(),
    ])

    const tables: TableSizeInfo[] = tablesResult.rows.map((row) => ({
      tableName: row.table_name,
      totalBytes: Number(row.total_bytes),
      prettySize: row.pretty_size,
    }))

    const totalDatabaseBytes = Number(dbSizeResult.rows[0]?.db_bytes ?? 0)
    const totalGb = totalDatabaseBytes / (1024 ** 3)

    const prettyTotal = `${totalGb.toFixed(2)} GB`

    logger.info('Storage stats fetched', {
      tableCount: tables.length,
      totalDatabaseBytes,
      thresholdGb,
      isAlertTriggered: totalGb >= thresholdGb,
    })

    return {
      tables,
      totalDatabaseBytes,
      prettyTotal,
      alertThresholdGb: thresholdGb,
      isAlertTriggered: totalGb >= thresholdGb,
      sampledAt: new Date(),
    }
  } catch (error) {
    logger.error('Failed to fetch storage stats', error as Error)
    throw new Error('Failed to retrieve storage statistics')
  }
}
