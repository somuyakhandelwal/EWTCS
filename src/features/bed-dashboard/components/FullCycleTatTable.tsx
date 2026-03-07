// Full-Cycle TAT Records Table
// US-3.4: Track Bed Turnaround Time
// Displays individual discharge → admission TAT records

import { memo } from 'react'
import { formatDuration } from '../lib/duration-formatters'
import type { FullCycleTatRecord } from '../types/bed'

interface FullCycleTatTableProps {
  records: FullCycleTatRecord[]
}

/** Format a Date to a short locale string for table display */
function formatTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Table showing per-bed full-cycle TAT records.
 * Columns: Bed, Previous Discharge, Next Admission, TAT Duration
 */
function FullCycleTatTableInner({ records }: FullCycleTatTableProps) {
  if (records.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No full-cycle turnaround records available.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-card-foreground">Bed</th>
            <th className="px-4 py-2 text-left font-medium text-card-foreground">Prev. Discharge</th>
            <th className="px-4 py-2 text-left font-medium text-card-foreground">Next Admission</th>
            <th className="px-4 py-2 text-left font-medium text-card-foreground">TAT</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => (
            <tr
              key={`${record.bedId}-${index}`}
              className="border-t border-border hover:bg-muted"
            >
              <td className="px-4 py-2 font-medium text-card-foreground">
                {record.bedNumber}
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {formatTimestamp(record.previousDischargedAt)}
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {formatTimestamp(record.admittedAt)}
              </td>
              <td className="px-4 py-2 text-card-foreground font-mono">
                {formatDuration(record.tatMs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const FullCycleTatTable = memo(FullCycleTatTableInner)
