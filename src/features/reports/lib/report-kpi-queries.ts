// Management Report Queries — KPI & Trends
// EPIC 10: US-10.1 – US-10.3, US-10.7

import 'server-only'
import { query } from '@/shared/lib/db'
import { config } from '@/shared/config/env'
import type { ReportMetrics, DailyTrend } from '../types/report'

const TARGET_DELAY_RATE = 0.1   // 10% target — configurable in future

export function delayMs(): number {
  return config.alert?.delayThresholdMs ?? 3_600_000
}

/** Build shared WHERE clause params */
export function buildRange(
  start: Date,
  end: Date,
  shiftId?: string,
): { clause: string; params: unknown[] } {
  const params: unknown[] = [start, end]
  let clause = 'bsl.transition_time BETWEEN $1 AND $2'
  if (shiftId) {
    params.push(shiftId)
    clause += ` AND bsl.shift_id = $${params.length}`
  }
  return { clause, params }
}

// ─── US-10.1 / 10.2 / 10.3 — Top-level KPI metrics ────────────────────────

interface RawMetrics {
  totalPatients:  string
  avgTatMs:       string | null
  delayedCount:   string
}

export async function getReportMetrics(
  start: Date,
  end: Date,
  shiftId?: string,
): Promise<ReportMetrics> {
  const dMs = delayMs()
  const { clause, params } = buildRange(start, end, shiftId)
  params.push(dMs)
  const threshParam = `$${params.length}`

  const result = await query<RawMetrics>(
    `SELECT
       COUNT(DISTINCT bsl.bed_id)                                       AS "totalPatients",
       AVG(bsl.duration_in_previous_stage_ms)::BIGINT                   AS "avgTatMs",
       COUNT(*) FILTER (
         WHERE bsl.duration_in_previous_stage_ms > ${threshParam}
       )                                                                 AS "delayedCount"
     FROM bed_stage_logs bsl
     WHERE ${clause}`,
    params,
  )

  const row = result.rows[0]
  const totalPatients = parseInt(row?.totalPatients ?? '0', 10)
  const delayedCount  = parseInt(row?.delayedCount  ?? '0', 10)

  const transResult = await query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM bed_stage_logs bsl WHERE ${clause.replace(new RegExp(`\\$${params.length}`, 'g'), '')}`,
    params.slice(0, params.length - 1),
  )
  const totalTrans = parseInt(transResult.rows[0]?.cnt ?? '1', 10) || 1

  return {
    totalPatients,
    avgTatMs: row?.avgTatMs !== null && row?.avgTatMs !== undefined
      ? parseInt(row.avgTatMs, 10)
      : null,
    delayedCount,
    delayRate:       delayedCount / totalTrans,
    targetDelayRate: TARGET_DELAY_RATE,
  }
}

// ─── US-10.7 — Daily trend ──────────────────────────────────────────────────

interface RawTrend {
  date:         string
  patientCount: string
  avgTatMs:     string | null
  delayedCount: string
}

export async function getDailyTrend(
  start: Date,
  end: Date,
  shiftId?: string,
): Promise<DailyTrend[]> {
  const dMs = delayMs()
  const { clause, params } = buildRange(start, end, shiftId)
  params.push(dMs)
  const threshParam = `$${params.length}`

  const result = await query<RawTrend>(
    `SELECT
       bsl.transition_time::date::text   AS date,
       COUNT(DISTINCT bsl.bed_id)        AS "patientCount",
       AVG(bsl.duration_in_previous_stage_ms)::BIGINT AS "avgTatMs",
       COUNT(*) FILTER (
         WHERE bsl.duration_in_previous_stage_ms > ${threshParam}
       )                                 AS "delayedCount"
     FROM bed_stage_logs bsl
     WHERE ${clause}
     GROUP BY bsl.transition_time::date
     ORDER BY bsl.transition_time::date ASC`,
    params,
  )

  return result.rows.map((r) => ({
    date:         r.date,
    patientCount: parseInt(r.patientCount, 10),
    avgTatMs:     r.avgTatMs !== null ? parseInt(r.avgTatMs, 10) : null,
    delayedCount: parseInt(r.delayedCount, 10),
  }))
}
