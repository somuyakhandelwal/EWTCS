/**
 * EPIC 7: Error Handling & Correction
 * DB queries for bed_stage_log_corrections (migration 007).
 * bed_stage_logs is immutable (migration 008) — corrections are separate rows.
 */

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type {
  HistoryCorrection,
  InsertCorrectionParams,
  CorrectionAuditFilters,
  CorrectionAuditRecord
} from '../types/corrections'

/** Insert a correction row and return its new UUID. Never modifies bed_stage_logs. */
export async function insertHistoryCorrection(params: InsertCorrectionParams): Promise<{ id: string }> {
  try {
    const result = await query<{ id: string }>(
      `INSERT INTO bed_stage_log_corrections
         (bed_stage_log_id, corrected_by_user_id, correction_reason, corrected_fields)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [params.bedStageLogId, params.correctedByUserId, params.correctionReason, JSON.stringify(params.correctedFields)]
    )
    return result.rows[0]
  } catch (error) {
    logger.error('insertHistoryCorrection: DB error', error as Error)
    throw new Error('Failed to save correction record')
  }
}

/** Fetch the full correction trail for a single bed_stage_log (oldest first). */
export async function fetchCorrectionsForLog(bedStageLogId: string): Promise<HistoryCorrection[]> {
  try {
    const result = await query<HistoryCorrection>(
      `SELECT
         c.id,
         c.bed_stage_log_id       AS "bedStageLogId",
         c.corrected_by_user_id   AS "correctedByUserId",
         u.username               AS "correctedByUsername",
         c.correction_reason      AS "correctionReason",
         c.corrected_fields       AS "correctedFields",
         c.corrected_at           AS "correctedAt"
       FROM bed_stage_log_corrections c
       JOIN users u ON u.id = c.corrected_by_user_id
       WHERE c.bed_stage_log_id = $1
       ORDER BY c.corrected_at ASC`,
      [bedStageLogId]
    )
    return result.rows
  } catch (error) {
    logger.error('fetchCorrectionsForLog: DB error', error as Error)
    throw new Error('Failed to fetch correction history')
  }
}

/** Return the set of bed_stage_log IDs that have ≥1 correction (for badge rendering). */
export async function fetchCorrectedLogIds(): Promise<Set<string>> {
  try {
    const result = await query<{ bedStageLogId: string }>(
      `SELECT DISTINCT bed_stage_log_id AS "bedStageLogId" FROM bed_stage_log_corrections`,
      []
    )
    return new Set(result.rows.map((r) => r.bedStageLogId))
  } catch (error) {
    logger.error('fetchCorrectedLogIds: DB error', error as Error)
    throw new Error('Failed to fetch correction metadata')
  }
}

/**
 * Return a map of logId → corrected stage name for every log that has a
 * to_stage_id correction. Uses the MOST RECENT correction per log.
 * Used by AuditorHistoryTable to display the corrected stage in the "To" column.
 */
export async function fetchCorrectedStageMap(): Promise<Map<string, string>> {
  try {
    const result = await query<{ logId: string; stageName: string }>(
      `SELECT DISTINCT ON (c.bed_stage_log_id)
         c.bed_stage_log_id                                        AS "logId",
         s.name                                                    AS "stageName"
       FROM bed_stage_log_corrections c
       JOIN stages s ON s.id = (c.corrected_fields -> 'to_stage_id' -> 'to' ->> 'id')::uuid
       WHERE c.corrected_fields ? 'to_stage_id'
       ORDER BY c.bed_stage_log_id, c.corrected_at DESC`,
      []
    )
    return new Map(result.rows.map((r) => [r.logId, r.stageName]))
  } catch (error) {
    logger.error('fetchCorrectedStageMap: DB error', error as Error)
    throw new Error('Failed to fetch corrected stage map')
  }
}

/** Read original fields from a bed_stage_log row to build the before/after diff (AC 3). */
export async function fetchBedStageLogOriginal(logId: string): Promise<{
  notes: string | null
  transitionTime: Date
  toStageId: string
  toStageName: string
} | null> {
  try {
    const result = await query<{ notes: string | null; transitionTime: Date; toStageId: string; toStageName: string }>(
      `SELECT
         bsl.notes,
         bsl.transition_time  AS "transitionTime",
         bsl.to_stage_id      AS "toStageId",
         s.name               AS "toStageName"
       FROM bed_stage_logs bsl
       JOIN stages s ON s.id = bsl.to_stage_id
       WHERE bsl.id = $1`,
      [logId]
    )
    return result.rows[0] ?? null
  } catch (error) {
    logger.error('fetchBedStageLogOriginal: DB error', error as Error)
    throw new Error('Failed to fetch original log record')
  }
}

/** Fetch a flat list of all corrections with filters for compliance auditing. */
export async function fetchCorrectionAuditTrail(filters: CorrectionAuditFilters): Promise<CorrectionAuditRecord[]> {
  try {
    const whereClauses: string[] = []
    const params: unknown[] = []

    if (filters.startDate) {
      params.push(filters.startDate)
      whereClauses.push(`c.corrected_at >= $${params.length}`)
    }
    if (filters.endDate) {
      params.push(filters.endDate)
      whereClauses.push(`c.corrected_at <= $${params.length}`)
    }
    if (filters.correctedByUserId) {
      params.push(filters.correctedByUserId)
      whereClauses.push(`c.corrected_by_user_id = $${params.length}`)
    }
    if (filters.bedNumber) {
      params.push(`%${filters.bedNumber}%`)
      whereClauses.push(`b.bed_number ILIKE $${params.length}`)
    }
    if (filters.reason) {
      params.push(`%${filters.reason}%`)
      whereClauses.push(`c.correction_reason ILIKE $${params.length}`)
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const result = await query<CorrectionAuditRecord>(
      `SELECT
         c.id,
         c.bed_stage_log_id       AS "bedStageLogId",
         c.corrected_by_user_id   AS "correctedByUserId",
         u.username               AS "correctedByUsername",
         c.correction_reason      AS "correctionReason",
         c.corrected_fields       AS "correctedFields",
         c.corrected_at           AS "correctedAt",
         b.bed_number             AS "bedNumber",
         bsl.notes                AS "originalNotes",
         bsl.transition_time      AS "originalTransitionTime",
         bsl.to_stage_id          AS "originalToStageId",
         s.name                   AS "originalToStageName",
         st_new.name              AS "correctedToStageName"
       FROM bed_stage_log_corrections c
       JOIN users u ON u.id = c.corrected_by_user_id
       JOIN bed_stage_logs bsl ON bsl.id = c.bed_stage_log_id
       JOIN beds b ON b.id = bsl.bed_id
       JOIN stages s ON s.id = bsl.to_stage_id
       LEFT JOIN stages st_new ON st_new.id = (
         CASE 
           WHEN c.corrected_fields ? 'to_stage_id' THEN
             CASE 
               WHEN jsonb_typeof(c.corrected_fields -> 'to_stage_id' -> 'to') = 'object' 
               THEN (c.corrected_fields -> 'to_stage_id' -> 'to' ->> 'id')
               ELSE (c.corrected_fields -> 'to_stage_id' ->> 'to')
             END
           ELSE NULL
         END
       )::uuid
       ${whereSql}
       ORDER BY c.corrected_at DESC`,
      params
    )
    return result.rows
  } catch (error) {
    logger.error('fetchCorrectionAuditTrail: DB error', error as Error)
    throw new Error('Failed to fetch correction audit trail')
  }
}
