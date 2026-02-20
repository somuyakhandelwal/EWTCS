// archival-queries.ts — DB helpers for archival_runs table reads
// EPIC 14 — US-14.1

import { query } from '@/shared/lib/db'
import type { ArchivalRun, RawArchivalRunRow } from './data-retention-types'

function mapRun(row: RawArchivalRunRow): ArchivalRun {
  return {
    id: row.id,
    triggeredBy: row.triggered_by,
    status: row.status,
    cutoffDate: new Date(row.cutoff_date),
    startedAt: new Date(row.started_at),
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
    rowsArchived: row.rows_archived ?? {},
    errorMessage: row.error_message,
  }
}

/** Return the most recent N archival run records for the status card. */
export async function getRecentArchivalRuns(limit = 5): Promise<ArchivalRun[]> {
  const result = await query<RawArchivalRunRow>(
    `SELECT id, triggered_by, status, cutoff_date, started_at, ended_at,
            rows_archived, error_message
     FROM archival_runs
     ORDER BY started_at DESC
     LIMIT $1`,
    [limit]
  )
  return result.rows.map(mapRun)
}

/** Return a single run by id — used by the approval flow. */
export async function getArchivalRunById(runId: string): Promise<ArchivalRun | null> {
  const result = await query<RawArchivalRunRow>(
    `SELECT id, triggered_by, status, cutoff_date, started_at, ended_at,
            rows_archived, error_message
     FROM archival_runs WHERE id = $1`,
    [runId]
  )
  return result.rows[0] ? mapRun(result.rows[0]) : null
}
