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
  bedStageLogYears: number
  requiresApproval: boolean
}
