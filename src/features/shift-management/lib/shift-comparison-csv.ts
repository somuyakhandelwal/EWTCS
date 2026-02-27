// shift-comparison-csv — CSV export helpers for ShiftComparisonView (US-8.4)
// Epic 8: Shift Management

import { formatShiftTime } from './shift-format'
import type { ShiftPerformanceRow } from '@/shared/types/report.types'
import { downloadCsv } from '@/shared/lib/csv-download'

/** Wrap a value in RFC-4180 quotes, escaping any inner double-quotes. */
function qc(val: string | number | null | undefined): string {
  const s = val == null ? '' : String(val)
  return `"${s.replace(/"/g, '""')}"`
}

export function rowsToCsv(rows: ShiftPerformanceRow[]): string {
  const header = ['Shift', 'Time Range', 'Patients Treated', 'Avg Stay (min)', 'Delayed Stages']
  const lines = rows.map(r => [
    r.shiftName,
    formatShiftTime(r.startTime, r.endTime),
    r.patientsTreated,
    r.avgTatMs !== null ? Math.round(r.avgTatMs / 60_000) : 'N/A',
    r.delayCount,
  ])
  return [header, ...lines].map(row => row.map(qc).join(',')).join('\n')
}

export { downloadCsv }

