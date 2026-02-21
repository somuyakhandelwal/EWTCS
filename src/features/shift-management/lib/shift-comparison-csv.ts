// shift-comparison-csv — CSV export helpers for ShiftComparisonView (US-8.4)
// Epic 8: Shift Management

import { formatShiftTime } from './shift-format'
import type { ShiftPerformanceRow } from '@/shared/types/report.types'

export function rowsToCsv(rows: ShiftPerformanceRow[]): string {
  const header = ['Shift', 'Time Range', 'Patients Treated', 'Avg Stay (min)', 'Delayed Stages']
  const lines = rows.map(r => [
    r.shiftName,
    formatShiftTime(r.startTime, r.endTime),
    r.patientsTreated,
    r.avgTatMs !== null ? Math.round(r.avgTatMs / 60_000) : 'N/A',
    r.delayCount,
  ])
  return [header, ...lines].map(row => row.join(',')).join('\n')
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
