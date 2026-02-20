'use client'
// BedPerformanceTable — Sortable table for US-10.4
// Epic 10: Management Report Dashboard
//
// Sortable by any column. Outlier rows highlighted in amber/red.
// Export button triggers a client-side CSV download.

import { memo, useMemo, useCallback } from 'react'
import { AlertTriangle, Download } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { formatDuration } from '@/features/bed-dashboard/lib/duration-formatters'
import { cn } from '@/shared/lib/utils'
import type { BedPerformanceRow } from '../types/report.types'
import type { SortField, SortDir } from '../hooks/useBedPerformanceData'
import { ColHeader, generateCSV } from './bed-performance-table-helpers'

interface BedPerformanceTableProps {
  rows: BedPerformanceRow[]
  sortField: SortField
  sortDir: SortDir
  onSort: (field: SortField) => void
  thresholdMs: number
}

export const BedPerformanceTable = memo(function BedPerformanceTable({
  rows,
  sortField,
  sortDir,
  onSort,
  thresholdMs,
}: BedPerformanceTableProps) {
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let cmp = 0
      if (sortField === 'bedNumber') {
        cmp = a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true })
      } else if (sortField === 'patientsTreated') {
        cmp = a.patientsTreated - b.patientsTreated
      } else if (sortField === 'avgDurationMs') {
        cmp = (a.avgDurationMs ?? 0) - (b.avgDurationMs ?? 0)
      } else if (sortField === 'delayRate') {
        cmp = a.delayRate - b.delayRate
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortField, sortDir])

  const handleExport = useCallback(() => {
    const csv = generateCSV(sorted, thresholdMs)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bed-performance-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [sorted, thresholdMs])

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/80 border-b border-zinc-800">
            <tr>
              <ColHeader field="bedNumber" label="Bed" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <ColHeader field="patientsTreated" label="Patients" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <ColHeader field="avgDurationMs" label="Avg Stay" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Min / Max</th>
              <ColHeader field="delayRate" label="Delay Rate" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Outlier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {sorted.map((row) => (
              <tr
                key={row.bedId}
                className={cn(
                  'transition-colors',
                  row.isOutlier ? 'bg-amber-950/20 hover:bg-amber-950/30' : 'hover:bg-zinc-800/40'
                )}
              >
                <td className={cn('px-3 py-2 font-mono text-xs font-semibold', row.isOutlier ? 'text-amber-300' : 'text-zinc-200')}>
                  {row.bedNumber}
                </td>
                <td className="px-3 py-2 text-zinc-300 tabular-nums">
                  {row.patientsTreated === 0 ? <span className="text-zinc-600">—</span> : row.patientsTreated}
                </td>
                <td className="px-3 py-2 font-mono text-zinc-300 tabular-nums">
                  {row.avgDurationMs !== null ? formatDuration(row.avgDurationMs) : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-3 py-2 text-zinc-500 tabular-nums text-xs">
                  {row.minDurationMs !== null
                    ? `${formatDuration(row.minDurationMs)} / ${formatDuration(row.maxDurationMs)}`
                    : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  <span className={cn(
                    'text-xs font-semibold',
                    row.delayRate > 50 ? 'text-red-400' : row.delayRate > 30 ? 'text-amber-400' : 'text-zinc-400'
                  )}>
                    {row.patientsTreated > 0 ? `${row.delayRate}%` : '—'}
                  </span>
                  {row.patientsTreated > 0 && (
                    <span className="text-zinc-600 text-[10px] ml-1">({row.delayedCount}/{row.patientsTreated})</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.isOutlier && row.patientsTreated > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Outlier
                    </span>
                  ) : (
                    <span className="text-zinc-700 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
})
