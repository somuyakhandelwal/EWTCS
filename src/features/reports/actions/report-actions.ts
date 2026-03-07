// Management Report Server Action
// EPIC 10: US-10.1 – US-10.7 — fetch all report data in one call

'use server'

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import {
  getReportMetrics,
  getDailyTrend,
  getBedPerformance,
  getStageDelays,
  getHeatmapData,
} from '../lib/report-queries'
import { reportFilterSchema } from '../schemas/report-schemas'
import type { ReportFilterInput } from '../schemas/report-schemas'
import type { ReportData } from '../types/report'

/** Default: last 30 days */
function defaultRange(): { start: Date; end: Date } {
  const end   = new Date()
  const start = new Date()
  start.setUTCDate(start.getUTCDate() - 30)
  start.setUTCHours(0, 0, 0, 0)
  end.setUTCHours(23, 59, 59, 999)
  return { start, end }
}

export async function getReportDataAction(input: ReportFilterInput = {}): Promise<{
  success: boolean
  data?: ReportData
  error?: string
}> {
  try {
    await requireRole(['admin', 'supervisor'])

    const parsed = reportFilterSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? 'Invalid input',
      }
    }

    const { startDate, endDate, shiftId } = parsed.data
    const def = defaultRange()
    const start = startDate ? new Date(`${startDate}T00:00:00Z`) : def.start
    const end   = endDate   ? new Date(`${endDate}T23:59:59Z`)   : def.end

    // Fetch all report data in parallel (US-10.1–10.7)
    const [metrics, trend, bedPerformance, stageDelays, heatmap] = await Promise.all([
      getReportMetrics(start, end, shiftId),
      getDailyTrend(start, end, shiftId),
      getBedPerformance(start, end, shiftId),
      getStageDelays(start, end, shiftId),
      getHeatmapData(start, end),
    ])

    return { success: true, data: { metrics, trend, bedPerformance, stageDelays, heatmap } }
  } catch (error) {
    logger.error('getReportDataAction failed', error as Error)
    return { success: false, error: 'Failed to load report data' }
  }
}

/** CSV export action — returns bed_stage_logs as CSV for the selected range */
export async function exportReportCSVAction(input: ReportFilterInput = {}): Promise<{
  success: boolean
  csv?: string
  filename?: string
  error?: string
}> {
  try {
    await requireRole(['admin', 'supervisor'])

    const parsed = reportFilterSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Invalid input' }

    const { startDate, endDate } = parsed.data
    const def = defaultRange()
    const start = startDate ? new Date(`${startDate}T00:00:00Z`) : def.start
    const end   = endDate   ? new Date(`${endDate}T23:59:59Z`)   : def.end

    // Inline import to avoid circular dep
    const { query } = await import('@/shared/lib/db')
    const result = await query<{
      bed: string; fromStage: string | null; toStage: string; transitionTime: string;
      durationMs: string | null; shift: string | null; changedBy: string
    }>(
      `SELECT
         b.bed_number        AS bed,
         fs.name             AS "fromStage",
         ts.name             AS "toStage",
         bsl.transition_time::text AS "transitionTime",
         bsl.duration_in_previous_stage_ms::text AS "durationMs",
         sh.name             AS shift,
         u.username          AS "changedBy"
       FROM bed_stage_logs bsl
       JOIN beds b    ON b.id  = bsl.bed_id
       JOIN stages ts ON ts.id = bsl.to_stage_id
       LEFT JOIN stages fs ON fs.id = bsl.from_stage_id
       LEFT JOIN shifts sh  ON sh.id  = bsl.shift_id
       LEFT JOIN users u    ON u.id   = bsl.changed_by
       WHERE bsl.transition_time BETWEEN $1 AND $2
       ORDER BY bsl.transition_time ASC
       LIMIT 50000`,
      [start, end],
    )

    const headers = ['Bed', 'From Stage', 'To Stage', 'Transition Time', 'Duration (ms)', 'Shift', 'Changed By']
    const rows = result.rows.map((r) => [
      r.bed, r.fromStage ?? '', r.toStage, r.transitionTime,
      r.durationMs ?? '', r.shift ?? '', r.changedBy,
    ])
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')

    const filename = `report-${startDate ?? 'all'}-to-${endDate ?? 'now'}.csv`
    return { success: true, csv, filename }
  } catch (error) {
    logger.error('exportReportCSVAction failed', error as Error)
    return { success: false, error: 'Export failed' }
  }
}
