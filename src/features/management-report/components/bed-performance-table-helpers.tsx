// bed-performance-table-helpers — US-10.4
// Shared helpers extracted from BedPerformanceTable:
// SortIcon, Col header, and CSV generation logic.

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatDuration } from '@/features/bed-dashboard/lib/duration-formatters'
import type { BedPerformanceRow } from '../types/report.types'
import type { SortField, SortDir } from '../hooks/useBedPerformanceData'

export function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField
  sortField: SortField
  sortDir: SortDir
}) {
  if (field !== sortField) return <ChevronsUpDown className="h-3 w-3 text-zinc-600" />
  return sortDir === 'asc'
    ? <ChevronUp className="h-3 w-3 text-blue-400" />
    : <ChevronDown className="h-3 w-3 text-blue-400" />
}

export function ColHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
  className,
}: {
  field: SortField
  label: string
  sortField: SortField
  sortDir: SortDir
  onSort: (f: SortField) => void
  className?: string
}) {
  return (
    <th
      className={cn(
        'px-3 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide',
        'cursor-pointer select-none hover:text-zinc-200 transition-colors',
        className
      )}
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </span>
    </th>
  )
}

export function generateCSV(rows: BedPerformanceRow[], thresholdMs: number): string {
  const thresholdLabel = formatDuration(thresholdMs)
  const headers = [
    'Bed',
    'Patients Treated',
    'Avg Duration',
    'Min Duration',
    'Max Duration',
    `Delayed (>${thresholdLabel})`,
    'Delay Rate %',
    'Outlier',
  ]
  const csvRows = rows.map((r) => [
    r.bedNumber,
    r.patientsTreated,
    r.avgDurationMs !== null ? formatDuration(r.avgDurationMs) : 'N/A',
    r.minDurationMs !== null ? formatDuration(r.minDurationMs) : 'N/A',
    r.maxDurationMs !== null ? formatDuration(r.maxDurationMs) : 'N/A',
    r.delayedCount,
    `${r.delayRate}%`,
    r.isOutlier ? 'Yes' : 'No',
  ])
  return [headers, ...csvRows].map((row) => row.join(',')).join('\n')
}
