// Export CSV Utilities — EPIC 11 (US-11.2)
// Generates CSV strings from management report data types.

import type { PatientCountSummary } from '@/features/management-report/types/report.types'
import type {
  DelayedPatientsSummary,
  DelayTrendPoint,
} from '@/features/management-report/types/report.types'
import type {
  BedPerformanceReport,
  BedPerformanceRow,
  StageDelayReport,
  StageDelayRow,
} from '@/features/management-report/types/report.types'
import { q, row, msToMinutes, formatIso } from './csv-core-utils'

/**
 * Generate CSV for the Patient Count summary (US-10.1).
 */
export function generatePatientCountCSV(
  summary: PatientCountSummary,
  rangeLabel: string
): string {
  const headers = ['Report', 'Date Range', 'Total Patients Treated', 'Avg Stay Duration (min)', 'Range Start', 'Range End', 'Shift']
  const dataRow = ['Patient Count Summary', rangeLabel, summary.totalPatients, msToMinutes(summary.avgDurationMs), formatIso(summary.rangeStart), formatIso(summary.rangeEnd), summary.shiftName ?? 'All Shifts']
  return [headers.map(q).join(','), dataRow.map(q).join(',')].join('\n')
}

/**
 * Generate CSV for the Delayed Patients % report (US-10.3).
 */
export function generateDelayedPatientsCSV(
  summary: DelayedPatientsSummary,
  rangeLabel: string
): string {
  const summaryHeaders = ['Report', 'Date Range', 'Total Patients', 'Delayed Patients', 'Delay %', 'Target %', 'Threshold (min)', 'Range Start', 'Range End']
  const summaryData = ['Delayed Patients Summary', rangeLabel, summary.totalPatients, summary.delayedPatients, summary.delayPct.toFixed(1), summary.targetPct != null ? summary.targetPct.toFixed(1) : 'Not Set', msToMinutes(summary.thresholdMs), formatIso(summary.rangeStart), formatIso(summary.rangeEnd)]
  const trendHeaders = ['Date', 'Total Patients', 'Delayed Patients', 'Delay %']
  const trendRows = summary.trend.map((p: DelayTrendPoint) => row(p.date, p.totalPatients, p.delayedPatients, p.delayPct.toFixed(1)))

  return [summaryHeaders.map(q).join(','), summaryData.map(q).join(','), '', 'Daily Trend', trendHeaders.map(q).join(','), ...trendRows].join('\n')
}

/**
 * Generate CSV for the Bed-Wise Performance report (US-10.4).
 */
export function generateBedPerformanceCSV(
  report: BedPerformanceReport,
  rangeLabel: string
): string {
  const metaRow = row('Report', 'Bed-Wise Performance', 'Date Range', rangeLabel, 'Threshold (min)', msToMinutes(report.thresholdMs), 'Overall Avg Stay (min)', msToMinutes(report.overallAvgMs))
  const headers = ['Bed Number', 'Patients Treated', 'Avg Stay (min)', 'Min Stay (min)', 'Max Stay (min)', 'Delayed Patients', 'Delay Rate (%)', 'Outlier']
  const dataRows = report.rows.map((r: BedPerformanceRow) => row(r.bedNumber, r.patientsTreated, msToMinutes(r.avgDurationMs), msToMinutes(r.minDurationMs), msToMinutes(r.maxDurationMs), r.delayedCount, r.delayRate.toFixed(1), r.isOutlier ? 'Yes' : 'No'))

  return [metaRow, '', headers.map(q).join(','), ...dataRows].join('\n')
}

/**
 * Generate CSV for the Stage-Wise Delays report (US-10.5).
 */
export function generateStageDelayCSV(
  report: StageDelayReport,
  rangeLabel: string
): string {
  const metaRow = row('Report', 'Stage-Wise Delays', 'Date Range', rangeLabel, 'Overall Mean (min)', msToMinutes(report.overallMeanMs))
  const headers = ['Stage Name', 'Total Transitions', 'Avg Duration (min)', 'Median Duration (min)', 'P90 Duration (min)', 'Bottleneck']
  const dataRows = report.rows.map((r: StageDelayRow) => row(r.stageName, r.totalTransitions, msToMinutes(r.avgDurationMs), msToMinutes(r.medianDurationMs), msToMinutes(r.p90DurationMs), r.isBottleneck ? 'Yes' : 'No'))

  return [metaRow, '', headers.map(q).join(','), ...dataRows].join('\n')
}
