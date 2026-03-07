// Management Report Queries — Bed Performance, Stages, Heatmap
// EPIC 10: US-10.4 – US-10.6
// Re-exports KPI queries for backward compatibility.

import 'server-only'
import { query } from '@/shared/lib/db'
import type { BedPerformance, StageDelay, HeatmapCell } from '../types/report'
import { delayMs, buildRange } from './report-kpi-queries'

export { getReportMetrics, getDailyTrend, delayMs, buildRange } from './report-kpi-queries'

// ─── US-10.4 — Per-bed performance ─────────────────────────────────────────

interface RawBed {
  bedId:        string
  bedNumber:    string
  patientCount: string
  avgTatMs:     string | null
  totalTrans:   string
  delayedCount: string
}

export async function getBedPerformance(
  start: Date,
  end: Date,
  shiftId?: string,
): Promise<BedPerformance[]> {
  const dMs = delayMs()
  const { clause, params } = buildRange(start, end, shiftId)
  params.push(dMs)
  const threshParam = `$${params.length}`

  const result = await query<RawBed>(
    `SELECT
       b.id                                                              AS "bedId",
       b.bed_number                                                      AS "bedNumber",
       COUNT(DISTINCT bsl.id)                                           AS "totalTrans",
       COUNT(DISTINCT bsl.bed_id)                                       AS "patientCount",
       AVG(bsl.duration_in_previous_stage_ms)::BIGINT                   AS "avgTatMs",
       COUNT(*) FILTER (
         WHERE bsl.duration_in_previous_stage_ms > ${threshParam}
       )                                                                 AS "delayedCount"
     FROM beds b
     JOIN bed_stage_logs bsl ON bsl.bed_id = b.id
     WHERE ${clause}
     GROUP BY b.id, b.bed_number
     ORDER BY b.bed_number`,
    params,
  )

  return result.rows.map((r) => {
    const totalTrans  = parseInt(r.totalTrans, 10) || 1
    const delayedCount = parseInt(r.delayedCount, 10)
    return {
      bedId:        r.bedId,
      bedNumber:    r.bedNumber,
      patientCount: parseInt(r.patientCount, 10),
      avgTatMs:     r.avgTatMs !== null ? parseInt(r.avgTatMs, 10) : null,
      delayedCount,
      delayRate:    delayedCount / totalTrans,
    }
  })
}

// ─── US-10.5 — Stage-wise delays ────────────────────────────────────────────

interface RawStage {
  stageId:         string
  stageName:       string
  avgDurationMs:   string
  transitionCount: string
}

export async function getStageDelays(
  start: Date,
  end: Date,
  shiftId?: string,
): Promise<StageDelay[]> {
  const { clause, params } = buildRange(start, end, shiftId)

  const result = await query<RawStage>(
    `SELECT
       s.id                                                              AS "stageId",
       s.name                                                            AS "stageName",
       AVG(bsl.duration_in_previous_stage_ms)::BIGINT                   AS "avgDurationMs",
       COUNT(bsl.id)                                                     AS "transitionCount"
     FROM stages s
     JOIN bed_stage_logs bsl ON bsl.to_stage_id = s.id
     WHERE ${clause}
       AND bsl.duration_in_previous_stage_ms IS NOT NULL
     GROUP BY s.id, s.name
     HAVING AVG(bsl.duration_in_previous_stage_ms) > 0
     ORDER BY AVG(bsl.duration_in_previous_stage_ms) DESC`,
    params,
  )

  return result.rows.map((r, idx) => ({
    stageId:         r.stageId,
    stageName:       r.stageName,
    avgDurationMs:   parseInt(r.avgDurationMs, 10),
    transitionCount: parseInt(r.transitionCount, 10),
    isBottleneck:    idx === 0,
  }))
}

// ─── US-10.6 — Activity heatmap (hour × DOW) ────────────────────────────────

interface RawHeatmap {
  dow:   string
  hour:  string
  count: string
}

export async function getHeatmapData(
  start: Date,
  end: Date,
): Promise<HeatmapCell[]> {
  const result = await query<RawHeatmap>(
    `SELECT
       EXTRACT(DOW  FROM transition_time AT TIME ZONE 'UTC')::int AS dow,
       EXTRACT(HOUR FROM transition_time AT TIME ZONE 'UTC')::int AS hour,
       COUNT(*)                                                    AS count
     FROM bed_stage_logs
     WHERE transition_time BETWEEN $1 AND $2
     GROUP BY dow, hour
     ORDER BY dow, hour`,
    [start, end],
  )

  return result.rows.map((r) => ({
    dow:   parseInt(r.dow,   10),
    hour:  parseInt(r.hour,  10),
    count: parseInt(r.count, 10),
  }))
}
