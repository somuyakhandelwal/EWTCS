// Daily Aggregation Queries — EPIC 9: Daily AI Summary
// Reads from existing tables to compute rolled-up daily statistics.

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { DailySummaryInput, DailySummaryMetadata } from '../types/daily-summary'
import {
    getDayBounds,
    msToMinutes,
    type RawPatientStats,
    type RawAvgStageTime,
    type RawDelayCount,
    type RawAvgTat,
    type RawMostDelayedStage,
} from './aggregation-helpers'

async function getPatientStats(
    dayStart: Date,
    dayEnd: Date
): Promise<{ totalPatients: number; totalBedsUsed: number; totalStageUpdates: number }> {
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

async function getAvgStageTime(dayStart: Date, dayEnd: Date): Promise<number> {
    const sql = `
    SELECT AVG(bsl.duration_in_previous_stage_ms) AS "avgStageTimeMs"
    FROM bed_stage_logs bsl
    WHERE bsl.transition_time >= $1 AND bsl.transition_time <= $2
      AND bsl.duration_in_previous_stage_ms IS NOT NULL
  `
    const result = await query<RawAvgStageTime>(sql, [dayStart, dayEnd])
    const raw = result.rows[0]?.avgStageTimeMs
    return raw !== null && raw !== undefined ? parseFloat(raw) : 0
}

async function getDelayCount(dayStart: Date, dayEnd: Date): Promise<number> {
    const sql = `
    SELECT COUNT(DISTINCT ddr.bed_id) AS "delayCount"
    FROM disposition_delay_reasons ddr
    WHERE ddr.recorded_at >= $1 AND ddr.recorded_at <= $2
  `
    const result = await query<RawDelayCount>(sql, [dayStart, dayEnd])
    return parseInt(result.rows[0]?.delayCount ?? '0', 10)
}

async function getAvgTat(dayStart: Date, dayEnd: Date): Promise<number> {
    const sql = `
    SELECT AVG(pa.tat_from_previous_discharge_ms) AS "avgTatMs"
    FROM patient_admissions pa
    WHERE pa.admitted_at >= $1 AND pa.admitted_at <= $2
      AND pa.tat_from_previous_discharge_ms IS NOT NULL
  `
    const result = await query<RawAvgTat>(sql, [dayStart, dayEnd])
    const raw = result.rows[0]?.avgTatMs
    return raw !== null && raw !== undefined ? parseFloat(raw) : 0
}

async function getMostDelayedStage(dayStart: Date, dayEnd: Date): Promise<string | undefined> {
    const sql = `
    SELECT s.name AS "stageName"
    FROM disposition_delay_reasons ddr
    JOIN bed_stage_logs bsl ON bsl.id = ddr.bed_stage_log_id
    JOIN stages s ON s.id = bsl.to_stage_id
    WHERE ddr.recorded_at >= $1 AND ddr.recorded_at <= $2
    GROUP BY s.name ORDER BY COUNT(*) DESC LIMIT 1
  `
    const result = await query<RawMostDelayedStage>(sql, [dayStart, dayEnd])
    return result.rows[0]?.stageName ?? undefined
}

interface RawMvSummaryRow {
    summary_date: string
    total_patients: string
    avg_stage_time_minutes: string
    delay_count: string
    avg_tat_minutes: string
    total_beds_used: string
    total_stage_updates: string
}

export interface AggregateParityResult {
    matches: boolean
    mismatches: string[]
}

function asTwoDp(value: number): number {
    return Math.round(value * 100) / 100
}

/**
 * Verifies aggregateDailyStats output matches daily_summaries_mv for a date.
 * Used by tests and optional runtime checks for DB2-01 parity.
 */
export async function verifyAggregateMatchesMaterializedView(
    dateStr: string
): Promise<AggregateParityResult> {
    const computed = await aggregateDailyStats(dateStr)
    const mvResult = await query<RawMvSummaryRow>(
        `SELECT
           summary_date,
           total_patients,
           avg_stage_time_minutes,
           delay_count,
           avg_tat_minutes,
           total_beds_used,
           total_stage_updates
         FROM daily_summaries_mv
         WHERE summary_date = $1
         LIMIT 1`,
        [dateStr]
    )

    const row = mvResult.rows[0]
    if (!row) {
        return { matches: false, mismatches: ['missing_materialized_row'] }
    }

    const mismatches: string[] = []
    if (computed.totalPatients !== parseInt(row.total_patients, 10)) mismatches.push('totalPatients')
    if (computed.totalBedsUsed !== parseInt(row.total_beds_used, 10)) mismatches.push('totalBedsUsed')
    if (computed.totalStageUpdates !== parseInt(row.total_stage_updates, 10)) mismatches.push('totalStageUpdates')
    if (computed.delayCount !== parseInt(row.delay_count, 10)) mismatches.push('delayCount')
    if (asTwoDp(computed.avgStageTimeMinutes) !== asTwoDp(parseFloat(row.avg_stage_time_minutes))) {
        mismatches.push('avgStageTimeMinutes')
    }
    if (asTwoDp(computed.avgTatMinutes) !== asTwoDp(parseFloat(row.avg_tat_minutes))) {
        mismatches.push('avgTatMinutes')
    }

    return { matches: mismatches.length === 0, mismatches }
}

export async function aggregateDailyStats(dateStr: string): Promise<DailySummaryInput> {
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
