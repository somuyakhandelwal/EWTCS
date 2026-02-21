// Export CSV Utilities — EPIC 11 (US-11.2)
// Generates CSV strings from management report data types.
// These are pure functions with no side effects so they can be unit-tested
// directly without mocking the database.

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrap a cell value in quotes and escape inner quotes. */
function q(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  return `"${s.replace(/"/g, '""')}"`
}

function row(...cells: (string | number | null | undefined)[]): string {
  return cells.map(q).join(',')
}

function msToMinutes(ms: number | null | undefined): string {
  if (ms == null) return 'N/A'
  return (ms / 60_000).toFixed(1)
}

function formatIso(d: Date | null | undefined): string {
  if (!d) return 'N/A'
  return d instanceof Date ? d.toISOString() : String(d)
}

// ---------------------------------------------------------------------------
// US-10.1 — Patient Count Summary
// ---------------------------------------------------------------------------

/**
 * Generate CSV for the Patient Count summary (US-10.1).
 * Produces a summary block — one header row + one data row.
 */
export function generatePatientCountCSV(
  summary: PatientCountSummary,
  rangeLabel: string
): string {
  const headers = [
    'Report',
    'Date Range',
    'Total Patients Treated',
    'Avg Stay Duration (min)',
    'Range Start',
    'Range End',
    'Shift',
  ]
  const dataRow = [
    'Patient Count Summary',
    rangeLabel,
    summary.totalPatients,
    msToMinutes(summary.avgDurationMs),
    formatIso(summary.rangeStart),
    formatIso(summary.rangeEnd),
    summary.shiftName ?? 'All Shifts',
  ]
  return [headers.map(q).join(','), dataRow.map(q).join(',')].join('\n')
}

// ---------------------------------------------------------------------------
// US-10.3 — Delayed Patients % (summary + trend rows)
// ---------------------------------------------------------------------------

/**
 * Generate CSV for the Delayed Patients % report (US-10.3).
 * First block: summary. Second block: daily trend.
 */
export function generateDelayedPatientsCSV(
  summary: DelayedPatientsSummary,
  rangeLabel: string
): string {
  // Summary block
  const summaryHeaders = [
    'Report',
    'Date Range',
    'Total Patients',
    'Delayed Patients',
    'Delay %',
    'Target %',
    'Threshold (min)',
    'Range Start',
    'Range End',
  ]
  const summaryData = [
    'Delayed Patients Summary',
    rangeLabel,
    summary.totalPatients,
    summary.delayedPatients,
    summary.delayPct.toFixed(1),
    summary.targetPct != null ? summary.targetPct.toFixed(1) : 'Not Set',
    msToMinutes(summary.thresholdMs),
    formatIso(summary.rangeStart),
    formatIso(summary.rangeEnd),
  ]

  // Trend block
  const trendHeaders = ['Date', 'Total Patients', 'Delayed Patients', 'Delay %']
  const trendRows = summary.trend.map((p: DelayTrendPoint) =>
    row(p.date, p.totalPatients, p.delayedPatients, p.delayPct.toFixed(1))
  )

  return [
    summaryHeaders.map(q).join(','),
    summaryData.map(q).join(','),
    '',
    'Daily Trend',
    trendHeaders.map(q).join(','),
    ...trendRows,
  ].join('\n')
}

// ---------------------------------------------------------------------------
// US-10.4 — Bed-Wise Performance
// ---------------------------------------------------------------------------

/**
 * Generate CSV for the Bed-Wise Performance report (US-10.4).
 * One row per bed.
 */
export function generateBedPerformanceCSV(
  report: BedPerformanceReport,
  rangeLabel: string
): string {
  const metaRow = row(
    'Report',
    'Bed-Wise Performance',
    'Date Range',
    rangeLabel,
    'Threshold (min)',
    msToMinutes(report.thresholdMs),
    'Overall Avg Stay (min)',
    msToMinutes(report.overallAvgMs)
  )

  const headers = [
    'Bed Number',
    'Patients Treated',
    'Avg Stay (min)',
    'Min Stay (min)',
    'Max Stay (min)',
    'Delayed Patients',
    'Delay Rate (%)',
    'Outlier',
  ]

  const dataRows = report.rows.map((r: BedPerformanceRow) =>
    row(
      r.bedNumber,
      r.patientsTreated,
      msToMinutes(r.avgDurationMs),
      msToMinutes(r.minDurationMs),
      msToMinutes(r.maxDurationMs),
      r.delayedCount,
      r.delayRate.toFixed(1),
      r.isOutlier ? 'Yes' : 'No'
    )
  )

  return [metaRow, '', headers.map(q).join(','), ...dataRows].join('\n')
}

// ---------------------------------------------------------------------------
// US-10.5 — Stage-Wise Delays
// ---------------------------------------------------------------------------

/**
 * Generate CSV for the Stage-Wise Delays report (US-10.5).
 * One row per stage.
 */
export function generateStageDelayCSV(
  report: StageDelayReport,
  rangeLabel: string
): string {
  const metaRow = row(
    'Report',
    'Stage-Wise Delays',
    'Date Range',
    rangeLabel,
    'Overall Mean (min)',
    msToMinutes(report.overallMeanMs)
  )

  const headers = [
    'Stage Name',
    'Total Transitions',
    'Avg Duration (min)',
    'Median Duration (min)',
    'P90 Duration (min)',
    'Bottleneck',
  ]

  const dataRows = report.rows.map((r: StageDelayRow) =>
    row(
      r.stageName,
      r.totalTransitions,
      msToMinutes(r.avgDurationMs),
      msToMinutes(r.medianDurationMs),
      msToMinutes(r.p90DurationMs),
      r.isBottleneck ? 'Yes' : 'No'
    )
  )

  return [metaRow, '', headers.map(q).join(','), ...dataRows].join('\n')
}
