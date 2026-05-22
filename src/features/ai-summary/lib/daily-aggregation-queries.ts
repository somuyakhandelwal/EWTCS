// Daily Aggregation Queries - EPIC 9 and EPIC 25 workflow TAT.

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { DailySummaryInput, DailySummaryMetadata } from '../types/daily-summary'
import { getDayBounds, msToMinutes } from './aggregation-helpers'
import {
  getAvgStageTime,
  getDelayCount,
  getMostDelayedStage,
  getPatientStats,
} from './daily-core-aggregation-queries'
import { getAvgTat } from './daily-workflow-tat-queries'

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
  if (!row) return { matches: false, mismatches: ['missing_materialized_row'] }

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

  const [patientStats, avgStageTimeMs, delayCount, avgTat, mostDelayedStage] =
    await Promise.all([
      getPatientStats(dayStart, dayEnd),
      getAvgStageTime(dayStart, dayEnd),
      getDelayCount(dayStart, dayEnd),
      getAvgTat(dayStart, dayEnd),
      getMostDelayedStage(dayStart, dayEnd),
    ])

  const metadata: DailySummaryMetadata = {}
  if (mostDelayedStage) metadata.mostDelayedStage = mostDelayedStage
  if (avgTat.avgErTatMs !== null) metadata.avgErTatMinutes = msToMinutes(avgTat.avgErTatMs)
  if (avgTat.avgTriageTatMs !== null) {
    metadata.avgTriageTatMinutes = msToMinutes(avgTat.avgTriageTatMs)
  }

  return {
    summaryDate: dateStr,
    totalPatients: patientStats.totalPatients,
    avgStageTimeMinutes: msToMinutes(avgStageTimeMs),
    delayCount,
    avgTatMinutes: msToMinutes(avgTat.avgTatMs),
    totalBedsUsed: patientStats.totalBedsUsed,
    totalStageUpdates: patientStats.totalStageUpdates,
    metadata,
  }
}
