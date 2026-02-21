// Turnaround Time Cleaning Queries (US-2.4)
// Track Bed Cleaning and Turnaround Time
// Computes TAT from bed_stage_logs — Discharge Process → Cleaning → Empty pipeline

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { TatRecord, TatSummary } from '../types/bed'

/**
 * Get completed TAT records within a time range.
 * TAT = time from Discharge Process start to Empty (cleaning complete).
 * @param hoursBack - How many hours back to look (default 24)
 * @param limit - Max records to return (default 50)
 */
export async function getCompletedTatRecords(
  hoursBack: number = 24,
  limit: number = 50
): Promise<TatRecord[]> {
  try {
    const result = await query<TatRecord>(
      `
      WITH discharge_events AS (
        SELECT
          bsl.bed_id,
          b.bed_number AS "bedNumber",
          bsl.transition_time AS "dischargeStartTime",
          ROW_NUMBER() OVER (
            PARTITION BY bsl.bed_id ORDER BY bsl.transition_time DESC
          ) AS rn
        FROM bed_stage_logs bsl
        JOIN beds b ON bsl.bed_id = b.id
        JOIN stages s ON bsl.to_stage_id = s.id
        WHERE LOWER(s.name) = 'discharge process'
          AND bsl.transition_time >= NOW() - INTERVAL '1 hour' * $1
      ),
      cleaning_events AS (
        SELECT
          bsl.bed_id,
          bsl.transition_time AS "cleaningStartTime",
          ROW_NUMBER() OVER (
            PARTITION BY bsl.bed_id ORDER BY bsl.transition_time DESC
          ) AS rn
        FROM bed_stage_logs bsl
        JOIN stages s ON bsl.to_stage_id = s.id
        WHERE LOWER(s.name) = 'cleaning'
          AND bsl.transition_time >= NOW() - INTERVAL '1 hour' * $1
      ),
      empty_events AS (
        SELECT
          bsl.bed_id,
          bsl.transition_time AS "cleaningEndTime",
          ROW_NUMBER() OVER (
            PARTITION BY bsl.bed_id ORDER BY bsl.transition_time DESC
          ) AS rn
        FROM bed_stage_logs bsl
        JOIN stages s ON bsl.to_stage_id = s.id
        WHERE LOWER(s.name) = 'empty'
          AND bsl.transition_time >= NOW() - INTERVAL '1 hour' * $1
      )
      SELECT
        d.bed_id AS "bedId",
        d."bedNumber",
        d."dischargeStartTime",
        c."cleaningStartTime",
        e."cleaningEndTime",
        EXTRACT(EPOCH FROM (e."cleaningEndTime" - d."dischargeStartTime")) * 1000
          AS "tatMs",
        CASE WHEN c."cleaningStartTime" IS NOT NULL AND e."cleaningEndTime" IS NOT NULL
          THEN EXTRACT(EPOCH FROM (e."cleaningEndTime" - c."cleaningStartTime")) * 1000
          ELSE NULL
        END AS "cleaningDurationMs"
      FROM discharge_events d
      LEFT JOIN cleaning_events c
        ON c.bed_id = d.bed_id AND c.rn = d.rn
      LEFT JOIN empty_events e
        ON e.bed_id = d.bed_id AND e.rn = d.rn
      WHERE e."cleaningEndTime" IS NOT NULL
        AND e."cleaningEndTime" > d."dischargeStartTime"
      ORDER BY e."cleaningEndTime" DESC
      LIMIT $2
      `,
      [hoursBack, limit]
    )

    return result.rows
  } catch (error) {
    logger.error('Failed to fetch TAT records', error as Error)
    throw new Error('Failed to fetch turnaround time records')
  }
}

/**
 * Get TAT summary statistics for a given time range
 * @param hoursBack - How many hours back to look (default 24)
 */
export async function getTatSummary(
  hoursBack: number = 24
): Promise<TatSummary> {
  try {
    const records = await getCompletedTatRecords(hoursBack, 1000)

    if (records.length === 0) {
      return {
        averageTatMs: 0,
        medianTatMs: null,
        maxTatMs: null,
        minTatMs: null,
        totalCompleted: 0,
        averageCleaningMs: null,
      }
    }

    const tatValues = records.map(r => r.tatMs)
    const cleaningValues = records
      .map(r => r.cleaningDurationMs)
      .filter((v): v is number => v !== null)

    const sorted = [...tatValues].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]

    const avgCleaning = cleaningValues.length > 0
      ? cleaningValues.reduce((a, b) => a + b, 0) / cleaningValues.length
      : null

    return {
      averageTatMs: tatValues.reduce((a, b) => a + b, 0) / tatValues.length,
      medianTatMs: median,
      maxTatMs: Math.max(...tatValues),
      minTatMs: Math.min(...tatValues),
      totalCompleted: records.length,
      averageCleaningMs: avgCleaning,
    }
  } catch (error) {
    logger.error('Failed to compute TAT summary', error as Error)
    throw new Error('Failed to compute turnaround time summary')
  }
}

/**
 * Get current cleaning duration for beds in Cleaning stage
 * Returns beds currently being cleaned with time elapsed
 */
export async function getCurrentCleaningBeds(): Promise<
  Array<{
    bedId: string
    bedNumber: string
    cleaningStartTime: Date
    cleaningDurationMs: number
  }>
> {
  try {
    const result = await query<{
      bedId: string
      bedNumber: string
      cleaningStartTime: Date
      cleaningDurationMs: number
    }>(
      `
      SELECT
        b.id AS "bedId",
        b.bed_number AS "bedNumber",
        b.last_stage_change AS "cleaningStartTime",
        EXTRACT(EPOCH FROM (NOW() - b.last_stage_change)) * 1000
          AS "cleaningDurationMs"
      FROM beds b
      JOIN stages s ON b.current_stage_id = s.id
      WHERE LOWER(s.name) = 'cleaning'
        AND b.is_active = true
      ORDER BY b.last_stage_change ASC
      `
    )

    return result.rows
  } catch (error) {
    logger.error('Failed to fetch current cleaning beds', error as Error)
    throw new Error('Failed to fetch current cleaning beds')
  }
}
