// retention-config-queries.ts — read/write retention settings from system_settings
// EPIC 14 — US-14.2

import { query } from '@/shared/lib/db'
import type { RetentionConfig } from './data-retention-types'

const DEFAULTS: RetentionConfig = {
  patientAdmissionsYears: 7,
  auditLogsYears: 7,
  bedStageLogDays: 90,
  offlineQueueDays: 30,
  requiresApproval: true,
}

/**
 * Read all four retention settings in a single query.
 * Falls back to safe defaults when a key is missing.
 */
export async function getRetentionConfig(): Promise<RetentionConfig> {
  const result = await query<{ key: string; value: string }>(
    `SELECT key, value FROM system_settings
     WHERE key IN (
       'retention_patient_admissions_years',
       'retention_audit_logs_years',
       'retention_bed_stage_log_days',
       'retention_offline_queue_days',
       'retention_bed_stage_log_years',
       'retention_requires_approval'
     )`
  )

  const map = Object.fromEntries(result.rows.map((r) => [r.key, r.value]))

  const legacyYears = parseInt(map['retention_bed_stage_log_years'] ?? '', 10)
  const legacyDays = Number.isInteger(legacyYears) && legacyYears > 0 ? legacyYears * 365 : null

  return {
    patientAdmissionsYears:
      parseInt(map['retention_patient_admissions_years'] ?? '', 10) ||
      DEFAULTS.patientAdmissionsYears,
    auditLogsYears:
      parseInt(map['retention_audit_logs_years'] ?? '', 10) ||
      DEFAULTS.auditLogsYears,
    bedStageLogDays:
      parseInt(map['retention_bed_stage_log_days'] ?? '', 10) ||
      legacyDays ||
      DEFAULTS.bedStageLogDays,
    offlineQueueDays:
      parseInt(map['retention_offline_queue_days'] ?? '', 10) ||
      DEFAULTS.offlineQueueDays,
    requiresApproval:
      (map['retention_requires_approval'] ?? 'true') !== 'false',
  }
}

/**
 * Upsert all four retention settings atomically.
 * Each key is updated individually via ON CONFLICT to preserve updated_at.
 */
export async function saveRetentionConfig(config: RetentionConfig): Promise<void> {
  const upsertSql = `
    INSERT INTO system_settings (key, value, description)
    VALUES ($1, $2, $3)
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW()`

  const rows: Array<[string, string, string]> = [
    [
      'retention_patient_admissions_years',
      String(config.patientAdmissionsYears),
      'Years to retain patient_admissions rows before archiving (EPIC 14)',
    ],
    [
      'retention_audit_logs_years',
      String(config.auditLogsYears),
      'Years to retain audit_logs rows before archiving (EPIC 14)',
    ],
    [
      'retention_bed_stage_log_days',
      String(config.bedStageLogDays),
      'Days to retain bed_stage_log rows before archiving (US-3.6)',
    ],
    [
      'retention_offline_queue_days',
      String(config.offlineQueueDays),
      'Days to retain drained/failed offline_queue rows before cleanup (DB5-01)',
    ],
    [
      'retention_bed_stage_log_years',
      String(Math.max(1, Math.ceil(config.bedStageLogDays / 365))),
      'Legacy years setting derived from bed_stage_log retention days',
    ],
    [
      'retention_requires_approval',
      config.requiresApproval ? 'true' : 'false',
      'When true, cron-triggered archival jobs pause for admin approval (EPIC 14)',
    ],
  ]

  for (const [key, value, description] of rows) {
    await query(upsertSql, [key, value, description])
  }
}
