// archival-runner.ts — core move-rows logic for EPIC 14 / US-14.1
//
// Each table is archived in its own transaction so a failure on one table
// does not roll back already-completed tables. Rows are moved in batches
// of BATCH_SIZE to avoid table-level lock contention on a live system.

import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { PoolClient } from 'pg'

const BATCH_SIZE = 500

// ── Per-table archive specs ───────────────────────────────────────────────

interface TableSpec {
  source: string
  archive?: string
  mode: 'archive' | 'cleanup'
  /** Column used to compare against the cutoff date */
  dateColumn: string
  /** Key into the RetentionConfig — used to look up the per-table cutoff. */
  configKey: 'patientAdmissions' | 'auditLogs' | 'bedStageLogs' | 'offlineQueue'
}

const ARCHIVAL_TABLES: TableSpec[] = [
  {
    source: 'patient_admissions',
    archive: 'patient_admissions_archive',
    mode: 'archive',
    dateColumn: 'created_at',
    configKey: 'patientAdmissions',
  },
  {
    source: 'audit_logs',
    archive: 'audit_logs_archive',
    mode: 'archive',
    dateColumn: 'created_at',
    configKey: 'auditLogs',
  },
  {
    source: 'bed_stage_logs',
    archive: 'bed_stage_logs_archive',
    mode: 'archive',
    dateColumn: 'transition_time',
    configKey: 'bedStageLogs',
  },
  {
    source: 'offline_queue',
    mode: 'cleanup',
    dateColumn: 'COALESCE(drained_at, failed_at)',
    configKey: 'offlineQueue',
  },
]

// ── Internal batch helpers ────────────────────────────────────────────────

/**
 * Move one batch of rows from source → archive within the provided client.
 * Returns the number of rows moved (0 means we are done for this table).
 */
async function archiveBatch(
  client: PoolClient,
  spec: TableSpec,
  cutoffDate: Date,
): Promise<number> {
  // CTE: grab up to BATCH_SIZE qualifying IDs, then move them atomically.
  const sql = spec.mode === 'archive'
    ? `
      WITH batch AS (
        SELECT id FROM ${spec.source}
        WHERE ${spec.dateColumn} < $1
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      ),
      moved AS (
        INSERT INTO ${spec.archive}
          SELECT s.*, NOW() AS archived_at
          FROM ${spec.source} s
          JOIN batch b ON b.id = s.id
        RETURNING id
      )
      DELETE FROM ${spec.source}
      WHERE id IN (SELECT id FROM moved)
      RETURNING id`
    : `
      WITH batch AS (
        SELECT id FROM ${spec.source}
        WHERE (
          (drained_at IS NOT NULL AND drained_at < $1)
          OR
          (failed_at IS NOT NULL AND failed_at < $1)
        )
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM ${spec.source}
      WHERE id IN (SELECT id FROM batch)
      RETURNING id`

  const result = await client.query(sql, [cutoffDate])
  return result.rowCount ?? 0
}

// ── Public runner ─────────────────────────────────────────────────────────

export interface ArchiveTableResult {
  table: string
  rowsMoved: number
  error?: string
}

/** Per-table cutoff dates — each table uses its own configured retention period. */
export interface ArchivalCutoffs {
  patientAdmissions: Date
  auditLogs: Date
  bedStageLogs: Date
  offlineQueue: Date
}

/**
 * Archive all rows older than the per-table cutoff dates.
 * Processes each table independently — a failure on one does not block others.
 *
 * @param cutoffs - Per-table cutoff Date objects derived from the retention config
 * @returns Per-table results including row counts and any error messages
 */
export async function archiveTables(
  cutoffs: ArchivalCutoffs,
): Promise<ArchiveTableResult[]> {
  const results: ArchiveTableResult[] = []

  for (const spec of ARCHIVAL_TABLES) {
    const cutoffDate = cutoffs[spec.configKey]
    const client = await pool.connect()
    let totalMoved = 0

    try {
      let batchCount = 0
      do {
        let inTransaction = false
        try {
          await client.query('BEGIN')
          inTransaction = true
          batchCount = await archiveBatch(client, spec, cutoffDate)
          await client.query('COMMIT')
          inTransaction = false
        } catch (batchErr) {
          if (inTransaction) {
            await client.query('ROLLBACK').catch(() => undefined)
          }
          throw batchErr
        }
        totalMoved += batchCount
      } while (batchCount === BATCH_SIZE)

      logger.info('Archival completed for table', {
        table: spec.source,
        rowsMoved: totalMoved,
        cutoffDate,
      })
      results.push({ table: spec.source, rowsMoved: totalMoved })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error('Archival failed for table', err as Error, { table: spec.source })
      results.push({ table: spec.source, rowsMoved: totalMoved, error: message })
    } finally {
      client.release()
    }
  }

  return results
}
