// Bed Turnaround Time (TAT) Queries
// US-2.4: Track Bed Cleaning and Turnaround Time
// Epic 2: One-Click Stage Update System
//
// TAT = time from bed entering Cleaning stage until it becomes Empty.
// This data lives in bed_stage_logs:
//   duration_in_previous_stage_ms on the Cleaning→Empty transition row
//   IS the cleaning/turnaround duration for that cycle.

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

export interface TATRecord {
  bedId: string
  bedNumber: string
  cleaningStartedAt: Date
  readyAt: Date
  durationMs: number
}

export interface TATSummary {
  totalCycles: number
  averageDurationMs: number
  minDurationMs: number | null
  maxDurationMs: number | null
  medianDurationMs: number | null
  p90DurationMs: number | null
}

interface RawTATSummary {
  totalCycles: string // pg returns COUNT as string
  averageDurationMs: string | null
  minDurationMs: string | null
  maxDurationMs: string | null
  medianDurationMs: string | null
  p90DurationMs: string | null
}

function parseTATSummary(raw: RawTATSummary): TATSummary {
  return {
    totalCycles: parseInt(raw.totalCycles, 10) || 0,
    averageDurationMs: parseFloat(raw.averageDurationMs ?? '0') || 0,
    minDurationMs: raw.minDurationMs !== null ? parseFloat(raw.minDurationMs) : null,
    maxDurationMs: raw.maxDurationMs !== null ? parseFloat(raw.maxDurationMs) : null,
    medianDurationMs: raw.medianDurationMs !== null ? parseFloat(raw.medianDurationMs) : null,
    p90DurationMs: raw.p90DurationMs !== null ? parseFloat(raw.p90DurationMs) : null,
  }
}

/**
 * Fetch all completed TAT cycles (Cleaning → Empty transitions).
 * Only rows with a measured duration are included.
 *
 * @param startDate - Optional lower bound on transition_time
 * @param endDate   - Optional upper bound on transition_time
 */
export async function getTATRecords(
  startDate?: Date,
  endDate?: Date
): Promise<TATRecord[]> {
  try {
    const params: unknown[] = []

    let sql = `
      SELECT
        b.id          AS "bedId",
        b.bed_number  AS "bedNumber",
        bsl.transition_time - (bsl.duration_in_previous_stage_ms * interval '1 millisecond')
                      AS "cleaningStartedAt",
        bsl.transition_time
                      AS "readyAt",
        bsl.duration_in_previous_stage_ms
                      AS "durationMs"
      FROM bed_stage_logs bsl
      JOIN beds   b ON b.id  = bsl.bed_id
      JOIN stages fs ON fs.id = bsl.from_stage_id
      JOIN stages ts ON ts.id = bsl.to_stage_id
      WHERE LOWER(fs.name) = 'cleaning'
        AND LOWER(ts.name) = 'empty'
        AND bsl.duration_in_previous_stage_ms IS NOT NULL
        AND bsl.duration_in_previous_stage_ms > 0
    `

    if (startDate) {
      params.push(startDate)
      sql += ` AND bsl.transition_time >= $${params.length}`
    }

    if (endDate) {
      params.push(endDate)
      sql += ` AND bsl.transition_time <= $${params.length}`
    }

    sql += ` ORDER BY bsl.transition_time DESC`

    const result = await query<TATRecord>(sql, params)
    return result.rows
  } catch (error) {
    logger.error('Failed to fetch TAT records', error as Error)
    throw new Error('Failed to fetch turnaround time records from database')
  }
}

/**
 * Fetch aggregate TAT statistics across all completed cycles.
 *
 * @param startDate - Optional lower bound on transition_time
 * @param endDate   - Optional upper bound on transition_time
 */
export async function getTATSummary(
  startDate?: Date,
  endDate?: Date
): Promise<TATSummary> {
  try {
    const params: unknown[] = []

    let sql = `
      SELECT
        COUNT(*)                                                          AS "totalCycles",
        COALESCE(AVG(bsl.duration_in_previous_stage_ms), 0)              AS "averageDurationMs",
        MIN(bsl.duration_in_previous_stage_ms)                           AS "minDurationMs",
        MAX(bsl.duration_in_previous_stage_ms)                           AS "maxDurationMs",
        PERCENTILE_CONT(0.5) WITHIN GROUP
          (ORDER BY bsl.duration_in_previous_stage_ms)                   AS "medianDurationMs",
        PERCENTILE_CONT(0.9) WITHIN GROUP
          (ORDER BY bsl.duration_in_previous_stage_ms)                   AS "p90DurationMs"
      FROM bed_stage_logs bsl
      JOIN stages fs ON fs.id = bsl.from_stage_id
      JOIN stages ts ON ts.id = bsl.to_stage_id
      WHERE LOWER(fs.name) = 'cleaning'
        AND LOWER(ts.name) = 'empty'
        AND bsl.duration_in_previous_stage_ms IS NOT NULL
        AND bsl.duration_in_previous_stage_ms > 0
    `

    if (startDate) {
      params.push(startDate)
      sql += ` AND bsl.transition_time >= $${params.length}`
    }

    if (endDate) {
      params.push(endDate)
      sql += ` AND bsl.transition_time <= $${params.length}`
    }

    const result = await query<RawTATSummary>(sql, params)
    return result.rows[0]
      ? parseTATSummary(result.rows[0])
      : {
          totalCycles: 0,
          averageDurationMs: 0,
          minDurationMs: null,
          maxDurationMs: null,
          medianDurationMs: null,
          p90DurationMs: null,
        }
  } catch (error) {
    logger.error('Failed to fetch TAT summary', error as Error)
    throw new Error('Failed to fetch turnaround time summary from database')
  }
}
