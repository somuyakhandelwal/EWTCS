// data-retention-types.ts — shared interfaces for EPIC 14
// US-14.1: Automated Data Archival
// US-14.2: Configurable Data Retention

// ── Archival run ───────────────────────────────────────────────────────────

export type ArchivalRunStatus =
  | 'running'
  | 'pending_approval'
  | 'completed'
  | 'failed'

export interface ArchivalRun {
  id: string
  triggeredBy: string   // 'cron' | user_id UUID
  status: ArchivalRunStatus
  cutoffDate: Date
  startedAt: Date
  endedAt: Date | null
  rowsArchived: Record<string, number>
  errorMessage: string | null
}

/** Raw DB row returned from archival_runs */
export interface RawArchivalRunRow {
  id: string
  triggered_by: string
  status: ArchivalRunStatus
  cutoff_date: string
  started_at: string
  ended_at: string | null
  rows_archived: Record<string, number>
  error_message: string | null
}

// ── Retention configuration ────────────────────────────────────────────────

/** Per-table retention periods and behaviour settings read from system_settings */
export interface RetentionConfig {
  patientAdmissionsYears: number
  auditLogsYears: number
  bedStageLogDays: number
  offlineQueueDays: number
  requiresApproval: boolean
}

// ── US-14.3: Archive retrieval ─────────────────────────────────────────────

/** Date-range search parameters for archive queries */
export interface ArchiveSearchParams {
  /** Table to search: 'patient_admissions' | 'audit_logs' */
  table: 'patient_admissions' | 'audit_logs'
  /** Inclusive start of the date range (ISO string or Date) */
  from: string
  /** Inclusive end of the date range (ISO string or Date) */
  to: string
  /** Max rows to return — guards against huge result sets */
  limit?: number
}

/** A single row returned from patient_admissions_archive */
export interface ArchivedAdmission {
  id: string
  bedId: string
  admittedAt: Date
  dischargedAt: Date
  totalDurationMs: number
  dischargedByUserId: string
  notes: string | null
  createdAt: Date
  tatFromPreviousDischargeMs: number | null
  archivedAt: Date
}

/** A single row returned from audit_logs_archive */
export interface ArchivedAuditLog {
  id: string
  actionType: string
  entityType: string
  entityId: string
  performedByUserId: string
  changes: Record<string, unknown>
  reason: string | null
  metadata: Record<string, unknown>
  ipAddress: string | null
  createdAt: Date
  archivedAt: Date
}

export type ArchivedRecord = ArchivedAdmission | ArchivedAuditLog

// ── US-14.4: Storage monitoring ────────────────────────────────────────────

/** Size metrics for a single database table */
export interface TableSizeInfo {
  tableName: string
  /** Total size including indexes, in bytes */
  totalBytes: number
  /** Readable label e.g. "14 MB" */
  prettySize: string
}

/** Aggregated database storage stats */
export interface StorageStats {
  /** Per-table breakdown — sorted largest first */
  tables: TableSizeInfo[]
  /** Total database size in bytes */
  totalDatabaseBytes: number
  /** Human-readable total e.g. "512 MB" */
  prettyTotal: string
  /** Admin-configured alert threshold in GB */
  alertThresholdGb: number
  /** true when total size > alertThresholdGb */
  isAlertTriggered: boolean
  /** Timestamp of when stats were sampled */
  sampledAt: Date
}
