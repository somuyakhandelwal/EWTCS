// Daily Aggregation Queries — EPIC 9: Daily AI Summary
// Reads from existing tables (bed_stage_logs, patient_admissions,
// disposition_delay_reasons, bed_stage_log_corrections) to compute
// rolled-up daily statistics for a given calendar date.

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { DailySummaryInput, DailySummaryMetadata } from '../types/daily-summary'

// ────────────────────────────────────────────────────────────
// Internal raw row types (pg returns numerics as strings)
// ────────────────────────────────────────────────────────────
interface RawPatientStats {
    totalPatients: string    // distinct admitted patients (from patient_admissions)
    totalBedsUsed: string   // distinct bed_ids with stage-log activity
    totalStageUpdates: string
}

interface RawAvgStageTime {
    avgStageTimeMs: string | null
}

interface RawDelayCount {
    delayCount: string
}

interface RawAvgTat {
    avgTatMs: string | null
}

interface RawMostDelayedStage {
    stageName: string | null
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/** Build the start and end of a calendar day in UTC for SQL filtering. */
function getDayBounds(dateStr: string): { dayStart: Date; dayEnd: Date } {
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`)
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`)
    return { dayStart, dayEnd }
}

/** Convert milliseconds to minutes, rounded to 2 dp. */
function msToMinutes(ms: number): number {
    return Math.round((ms / 60000) * 100) / 100
}

// ────────────────────────────────────────────────────────────
// Individual stat queries
// ────────────────────────────────────────────────────────────

/**
 * Count patients, distinct beds, and total stage updates for the day.
 * A "patient" is counted as each unique bed_id that had at least one
 * non-empty-stage log entry on the given date.
 */
async function getPatientStats(
    dayStart: Date,
    dayEnd: Date
): Promise<{ totalPatients: number; totalBedsUsed: number; totalStageUpdates: number }> {
    // totalPatients  — unique patients admitted during the day (via patient_admissions)
    // totalBedsUsed  — distinct beds that had at least one stage-log entry during the day
    // totalStageUpdates — raw count of all stage-log rows
    const sql = `
    SELECT
      COUNT(DISTINCT pa.id)          AS "totalPatients",
      COUNT(DISTINCT bsl.bed_id)     AS "totalBedsUsed",
      COUNT(bsl.id)                  AS "totalStageUpdates"
    FROM bed_stage_logs bsl
    LEFT JOIN patient_admissions pa
      ON pa.bed_id = bsl.bed_id
     AND pa.admitted_at >= $1
     AND pa.admitted_at <= $2
    WHERE bsl.transition_time >= $1
      AND bsl.transition_time <= $2
  `
    const result = await query<RawPatientStats>(sql, [dayStart, dayEnd])
    const row = result.rows[0]
    return {
        totalPatients: parseInt(row?.totalPatients ?? '0', 10),
        totalBedsUsed: parseInt(row?.totalBedsUsed ?? '0', 10),
        totalStageUpdates: parseInt(row?.totalStageUpdates ?? '0', 10),
    }
}

/**
 * Compute the average time (in ms) a bed spent in any single stage during the day.
 * Uses duration_in_previous_stage_ms from bed_stage_logs.
 */
async function getAvgStageTime(
    dayStart: Date,
    dayEnd: Date
): Promise<number> {
    const sql = `
    SELECT
      AVG(bsl.duration_in_previous_stage_ms) AS "avgStageTimeMs"
    FROM bed_stage_logs bsl
    WHERE bsl.transition_time >= $1
      AND bsl.transition_time <= $2
      AND bsl.duration_in_previous_stage_ms IS NOT NULL
  `
    const result = await query<RawAvgStageTime>(sql, [dayStart, dayEnd])
    const raw = result.rows[0]?.avgStageTimeMs
    return raw !== null && raw !== undefined ? parseFloat(raw) : 0
}

/**
 * Count beds flagged as delayed (via disposition_delay_reasons) on the given date.
 */
async function getDelayCount(
    dayStart: Date,
    dayEnd: Date
): Promise<number> {
    const sql = `
    SELECT COUNT(DISTINCT ddr.bed_id) AS "delayCount"
    FROM disposition_delay_reasons ddr
    WHERE ddr.recorded_at >= $1
      AND ddr.recorded_at <= $2
  `
    const result = await query<RawDelayCount>(sql, [dayStart, dayEnd])
    return parseInt(result.rows[0]?.delayCount ?? '0', 10)
}

/**
 * Compute average full-cycle TAT in ms for the day.
 * Sourced from patient_admissions.tat_from_previous_discharge_ms.
 */
async function getAvgTat(dayStart: Date, dayEnd: Date): Promise<number> {
    const sql = `
    SELECT AVG(pa.tat_from_previous_discharge_ms) AS "avgTatMs"
    FROM patient_admissions pa
    WHERE pa.admitted_at >= $1
      AND pa.admitted_at <= $2
      AND pa.tat_from_previous_discharge_ms IS NOT NULL
  `
    const result = await query<RawAvgTat>(sql, [dayStart, dayEnd])
    const raw = result.rows[0]?.avgTatMs
    return raw !== null && raw !== undefined ? parseFloat(raw) : 0
}

/**
 * Find the stage with the highest delay count for extra metadata.
 */
async function getMostDelayedStage(
    dayStart: Date,
    dayEnd: Date
): Promise<string | undefined> {
    const sql = `
    SELECT s.name AS "stageName"
    FROM disposition_delay_reasons ddr
    JOIN bed_stage_logs bsl ON bsl.id = ddr.bed_stage_log_id
    JOIN stages s ON s.id = bsl.to_stage_id
    WHERE ddr.recorded_at >= $1
      AND ddr.recorded_at <= $2
    GROUP BY s.name
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `
    const result = await query<RawMostDelayedStage>(sql, [dayStart, dayEnd])
    return result.rows[0]?.stageName ?? undefined
}

// ────────────────────────────────────────────────────────────
// Main aggregator — composes all individual queries
// ────────────────────────────────────────────────────────────

/**
 * Aggregate all daily statistics for a given date string (YYYY-MM-DD).
 * Composes multiple targeted queries into a single DailySummaryInput.
 * Safe to call multiple times — result is idempotent.
 */
export async function aggregateDailyStats(
    dateStr: string
): Promise<DailySummaryInput> {
    const { dayStart, dayEnd } = getDayBounds(dateStr)

    logger.info(`[ai-summary] Aggregating stats for ${dateStr}`)

    const [patientStats, avgStageTimeMs, delayCount, avgTatMs, mostDelayedStage] =
        await Promise.all([
            getPatientStats(dayStart, dayEnd),
            getAvgStageTime(dayStart, dayEnd),
            getDelayCount(dayStart, dayEnd),
            getAvgTat(dayStart, dayEnd),
            getMostDelayedStage(dayStart, dayEnd),
        ])

    const metadata: DailySummaryMetadata = {}
    if (mostDelayedStage) metadata.mostDelayedStage = mostDelayedStage

    return {
        summaryDate: dateStr,
        totalPatients: patientStats.totalPatients,
        avgStageTimeMinutes: msToMinutes(avgStageTimeMs),
        delayCount,
        avgTatMinutes: msToMinutes(avgTatMs),
        totalBedsUsed: patientStats.totalBedsUsed,
        totalStageUpdates: patientStats.totalStageUpdates,
        metadata,
    }
}
