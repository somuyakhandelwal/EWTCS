// Full-Cycle Turnaround Time (TAT) Queries
// US-3.4: Track Bed Turnaround Time
// Epic 3: Time Tracking & Stage Logging
//
// Full-cycle TAT = time from previous patient discharge to current patient admission.
// Stored in patient_admissions.tat_from_previous_discharge_ms at discharge time.

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

export interface FullCycleTatRecord {
  bedId: string
  bedNumber: string
  previousDischargedAt: Date
  admittedAt: Date
  tatMs: number
}

export interface FullCycleTatSummary {
  totalCycles: number
  averageTatMs: number
  medianTatMs: number | null
  minTatMs: number | null
  maxTatMs: number | null
  p90TatMs: number | null
}

/**
 * Fetch individual full-cycle TAT records with optional date filtering.
 * Each record represents one discharge→next-admission cycle on a bed.
 */
export async function getFullCycleTatRecords(
  startDate?: Date,
  endDate?: Date,
  limit: number = 50
): Promise<FullCycleTatRecord[]> {
  try {
    const params: unknown[] = []
    let sql = `
      SELECT
        pa.bed_id                            AS "bedId",
        b.bed_number                         AS "bedNumber",
        pa.admitted_at - (pa.tat_from_previous_discharge_ms * interval '1 millisecond')
                                             AS "previousDischargedAt",
        pa.admitted_at                       AS "admittedAt",
        pa.tat_from_previous_discharge_ms    AS "tatMs"
      FROM patient_admissions pa
      JOIN beds b ON b.id = pa.bed_id
      WHERE pa.tat_from_previous_discharge_ms IS NOT NULL
    `

    if (startDate) {
      params.push(startDate)
      sql += ` AND pa.discharged_at >= $${params.length}`
    }

    if (endDate) {
      params.push(endDate)
      sql += ` AND pa.discharged_at <= $${params.length}`
    }

    params.push(limit)
    sql += ` ORDER BY pa.discharged_at DESC LIMIT $${params.length}`

    const result = await query<FullCycleTatRecord>(sql, params)
    return result.rows
  } catch (error) {
    logger.error('Failed to fetch full-cycle TAT records', error as Error)
    throw new Error('Failed to fetch full-cycle turnaround time records')
  }
}

/**
 * Fetch aggregate full-cycle TAT statistics.
 * Uses SQL percentile functions for median and p90.
 */
export async function getFullCycleTatSummary(
  startDate?: Date,
  endDate?: Date
): Promise<FullCycleTatSummary> {
  try {
    const params: unknown[] = []
    let sql = `
      SELECT
        COUNT(*)::text                                              AS "totalCycles",
        COALESCE(AVG(tat_from_previous_discharge_ms), 0)::text     AS "averageTatMs",
        MIN(tat_from_previous_discharge_ms)::text                  AS "minTatMs",
        MAX(tat_from_previous_discharge_ms)::text                  AS "maxTatMs",
        (PERCENTILE_CONT(0.5) WITHIN GROUP
          (ORDER BY tat_from_previous_discharge_ms))::text         AS "medianTatMs",
        (PERCENTILE_CONT(0.9) WITHIN GROUP
          (ORDER BY tat_from_previous_discharge_ms))::text         AS "p90TatMs"
      FROM patient_admissions
      WHERE tat_from_previous_discharge_ms IS NOT NULL
    `

    if (startDate) {
      params.push(startDate)
      sql += ` AND discharged_at >= $${params.length}`
    }

    if (endDate) {
      params.push(endDate)
      sql += ` AND discharged_at <= $${params.length}`
    }

    const result = await query<Record<string, string | null>>(sql, params)
    const row = result.rows[0]

    if (!row || row.totalCycles === '0') {
      return {
        totalCycles: 0,
        averageTatMs: 0,
        medianTatMs: null,
        minTatMs: null,
        maxTatMs: null,
        p90TatMs: null,
      }
    }

    return {
      totalCycles: parseInt(row.totalCycles ?? '0', 10),
      averageTatMs: parseFloat(row.averageTatMs ?? '0'),
      medianTatMs: row.medianTatMs ? parseFloat(row.medianTatMs) : null,
      minTatMs: row.minTatMs ? parseFloat(row.minTatMs) : null,
      maxTatMs: row.maxTatMs ? parseFloat(row.maxTatMs) : null,
      p90TatMs: row.p90TatMs ? parseFloat(row.p90TatMs) : null,
    }
  } catch (error) {
    logger.error('Failed to fetch full-cycle TAT summary', error as Error)
    throw new Error('Failed to fetch full-cycle turnaround time summary')
  }
}
