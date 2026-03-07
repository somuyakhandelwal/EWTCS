// AI Summary — Daily Aggregate Statistics
// EPIC 9 US-9.1: Collect and aggregate daily ED performance metrics
// Idempotent: purely reads from bed_stage_logs, stages, shifts — never writes.

import 'server-only'
import { query } from '@/shared/lib/db'
import { config } from '@/shared/config/env'
import type { DailyStats } from '../types/summary'

interface RawTransitionsRow {
  totalTransitions: string
  delayedTransitions: string
  avgTatMs: string | null
  bedsUsed: string
  totalPatients: string
}

interface RawBottleneckRow {
  stageName: string
  avgDurationMs: string
}

interface RawBusiestShiftRow {
  shiftName: string
  transitionCount: string
}

/**
 * Aggregate daily ED stats for a given calendar date (UTC).
 * Used as the data input for the AI-generated summary.
 */
export async function aggregateDailyStats(date: Date): Promise<DailyStats> {
  const dateStr = date.toISOString().slice(0, 10)     // 'YYYY-MM-DD'
  const dayStart = `${dateStr} 00:00:00+00`
  const dayEnd   = `${dateStr} 23:59:59.999+00`
  const delayThresholdMs = config.alert?.delayThresholdMs ?? 3_600_000  // 1h fallback

  // Main metrics in one query
  const mainResult = await query<RawTransitionsRow>(
    `SELECT
       COUNT(*)                                                          AS "totalTransitions",
       COUNT(*) FILTER (
         WHERE duration_in_previous_stage_ms > $3
       )                                                                 AS "delayedTransitions",
       AVG(duration_in_previous_stage_ms)::BIGINT                       AS "avgTatMs",
       COUNT(DISTINCT bed_id)                                            AS "bedsUsed",
       COUNT(DISTINCT bed_id)                                            AS "totalPatients"
     FROM bed_stage_logs
     WHERE transition_time BETWEEN $1 AND $2`,
    [dayStart, dayEnd, delayThresholdMs],
  )

  const m = mainResult.rows[0]
  const totalTransitions  = parseInt(m?.totalTransitions  ?? '0', 10)
  const delayedTransitions = parseInt(m?.delayedTransitions ?? '0', 10)
  const avgTatMs           = m?.avgTatMs !== null && m?.avgTatMs !== undefined
    ? parseInt(m.avgTatMs, 10)
    : null
  const bedsUsed           = parseInt(m?.bedsUsed      ?? '0', 10)
  const totalPatients      = parseInt(m?.totalPatients ?? '0', 10)
  const delayRate          = totalTransitions > 0
    ? delayedTransitions / totalTransitions
    : 0

  // Bottleneck stage = stage with highest average duration this day
  const bottleneckResult = await query<RawBottleneckRow>(
    `SELECT s.name AS "stageName",
            AVG(bsl.duration_in_previous_stage_ms) AS "avgDurationMs"
     FROM bed_stage_logs bsl
     JOIN stages s ON s.id = bsl.to_stage_id
     WHERE bsl.transition_time BETWEEN $1 AND $2
       AND bsl.duration_in_previous_stage_ms IS NOT NULL
     GROUP BY s.id, s.name
     ORDER BY AVG(bsl.duration_in_previous_stage_ms) DESC
     LIMIT 1`,
    [dayStart, dayEnd],
  )
  const topBottleneckStage = bottleneckResult.rows[0]?.stageName ?? null

  // Busiest shift = shift_id bucket with most transitions
  const shiftResult = await query<RawBusiestShiftRow>(
    `SELECT sh.name AS "shiftName",
            COUNT(bsl.id) AS "transitionCount"
     FROM bed_stage_logs bsl
     JOIN shifts sh ON sh.id = bsl.shift_id
     WHERE bsl.transition_time BETWEEN $1 AND $2
     GROUP BY sh.id, sh.name
     ORDER BY COUNT(bsl.id) DESC
     LIMIT 1`,
    [dayStart, dayEnd],
  )
  const busiestShift = shiftResult.rows[0]?.shiftName ?? null

  return {
    date: dateStr,
    totalPatients,
    totalTransitions,
    avgTatMs,
    delayedTransitions,
    delayRate,
    bedsUsed,
    topBottleneckStage,
    busiestShift,
  }
}
