// archival-run-helpers.ts — DB write helpers for archival_runs lifecycle
// EPIC 14 — US-14.1 (internal, not exported from the feature)

import { query } from '@/shared/lib/db'
import type { ArchiveTableResult } from './archival-runner'

/** Insert a new archival_runs row with status='running' and return its id. */
export async function createRunRecord(
  triggeredBy: string,
  cutoffDate: Date,
): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO archival_runs (triggered_by, status, cutoff_date)
     VALUES ($1, 'running', $2)
     RETURNING id`,
    [triggeredBy, cutoffDate],
  )
  return result.rows[0].id
}

/** Mark a run as completed and persist the per-table row counts. */
export async function finaliseRunRecord(
  runId: string,
  rowsArchived: Record<string, number>,
): Promise<void> {
  await query(
    `UPDATE archival_runs
     SET status = 'completed', ended_at = NOW(), rows_archived = $2
     WHERE id = $1`,
    [runId, JSON.stringify(rowsArchived)],
  )
}

/** Mark a run as failed and record the error message. */
export async function failRunRecord(runId: string, message: string): Promise<void> {
  await query(
    `UPDATE archival_runs
     SET status = 'failed', ended_at = NOW(), error_message = $2
     WHERE id = $1`,
    [runId, message],
  )
}

/** Reduce an array of per-table results into a rows-archived map + error list. */
export function collectResults(tableResults: ArchiveTableResult[]): {
  rowsArchived: Record<string, number>
  errors: string[]
} {
  const rowsArchived: Record<string, number> = {}
  const errors: string[] = []
  for (const r of tableResults) {
    rowsArchived[r.table] = r.rowsMoved
    if (r.error) errors.push(`${r.table}: ${r.error}`)
  }
  return { rowsArchived, errors }
}

/** Compute the oldest cutoff date from a list of retention periods in years. */
export function computeCutoffDate(retentionYears: number[]): Date {
  const minYears = Math.min(...retentionYears)
  const d = new Date()
  d.setFullYear(d.getFullYear() - minYears)
  return d
}
