'use client'
// Bed Performance Table — US-10.4
// Sortable table showing per-bed metrics; outlier beds highlighted.

import { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { BedPerformance } from '../types/report'

type SortKey = keyof Pick<BedPerformance, 'bedNumber' | 'patientCount' | 'avgTatMs' | 'delayedCount' | 'delayRate'>

function msToHM(ms: number | null): string {
  if (ms === null) return '—'
  const m = Math.round(ms / 60_000)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

interface BedPerformanceTableProps {
  beds: BedPerformance[]
}

export function BedPerformanceTable({ beds }: BedPerformanceTableProps) {
  const [sortKey, setSortKey]   = useState<SortKey>('delayRate')
  const [sortAsc, setSortAsc]   = useState(false)

  if (beds.length === 0) {
    return <p className="text-center text-zinc-500 text-sm py-8">No bed data for this period.</p>
  }

  // Compute p75 delay rate to flag outliers
  const sorted75 = [...beds].sort((a, b) => a.delayRate - b.delayRate)
  const p75idx   = Math.floor(sorted75.length * 0.75)
  const p75rate  = sorted75[p75idx]?.delayRate ?? 1

  const sorted = [...beds].sort((a, b) => {
    const va = a[sortKey] ?? 0
    const vb = b[sortKey] ?? 0
    if (va < vb) return sortAsc ? -1 : 1
    if (va > vb) return sortAsc ? 1 : -1
    return 0
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-zinc-600" />
    return sortAsc
      ? <ArrowUp   className="h-3 w-3 text-blue-400" />
      : <ArrowDown className="h-3 w-3 text-blue-400" />
  }

  const headers: { key: SortKey; label: string }[] = [
    { key: 'bedNumber',    label: 'Bed' },
    { key: 'patientCount', label: 'Patients' },
    { key: 'avgTatMs',     label: 'Avg TAT' },
    { key: 'delayedCount', label: 'Delayed' },
    { key: 'delayRate',    label: 'Delay %' },
  ]

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700 bg-zinc-800/60">
            {headers.map((h) => (
              <th key={h.key}
                className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide cursor-pointer hover:text-zinc-200 transition-colors select-none"
                onClick={() => toggleSort(h.key)}
              >
                <span className="flex items-center gap-1">
                  {h.label} <SortIcon col={h.key} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {sorted.map((bed) => {
            const isOutlier = bed.delayRate > p75rate
            return (
              <tr
                key={bed.bedId}
                className={`transition-colors ${isOutlier ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-zinc-800/40'}`}
              >
                <td className="px-3 py-2 font-semibold text-zinc-100">
                  {bed.bedNumber}
                  {isOutlier && (
                    <span className="ml-2 text-xs text-red-400 font-normal">⚠ outlier</span>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-300">{bed.patientCount}</td>
                <td className="px-3 py-2 font-mono text-zinc-300">{msToHM(bed.avgTatMs)}</td>
                <td className="px-3 py-2 text-zinc-300">{bed.delayedCount}</td>
                <td className={`px-3 py-2 font-semibold ${isOutlier ? 'text-red-400' : 'text-zinc-300'}`}>
                  {(bed.delayRate * 100).toFixed(1)}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
