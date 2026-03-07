// Alert Filters Bar
// EPIC 15: Notifications & Alerts (US-15.4)

'use client'

import { SlidersHorizontal } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { AlertScreenFilters, AlertSortField } from '../types/alert'

interface AlertFiltersProps {
  filters: AlertScreenFilters
  onChange: (next: AlertScreenFilters) => void
  totalCount: number
  criticalCount: number
  warningCount: number
  acknowledgedCount: number
}

const SORT_OPTIONS: { value: AlertSortField; label: string }[] = [
  { value: 'severity', label: 'Severity' },
  { value: 'elapsed',  label: 'Time Elapsed' },
  { value: 'type',     label: 'Alert Type' },
]

export function AlertFilters({
  filters,
  onChange,
  totalCount,
  criticalCount,
  warningCount,
  acknowledgedCount,
}: AlertFiltersProps) {
  function toggleDir() {
    onChange({
      ...filters,
      sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc',
    })
  }

  function setSort(field: AlertSortField) {
    onChange({ ...filters, sortBy: field })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Stats pills */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <StatPill value={totalCount}        label="Total"        colorClass="text-zinc-300 border-zinc-700" />
        <StatPill value={criticalCount}     label="Critical"     colorClass="text-red-300  border-red-800"  />
        <StatPill value={warningCount}      label="Warning"      colorClass="text-amber-300 border-amber-800" />
        <StatPill value={acknowledgedCount} label="Acknowledged" colorClass="text-emerald-300 border-emerald-900" />
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
        <span className="text-xs text-zinc-500">Sort:</span>
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSort(opt.value)}
              className={cn(
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                filters.sortBy === opt.value
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleDir}
          className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          title={filters.sortDir === 'asc' ? 'Ascending' : 'Descending'}
        >
          {filters.sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>
        <label className="flex items-center gap-1.5 ml-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.showAcknowledged}
            onChange={(e) => onChange({ ...filters, showAcknowledged: e.target.checked })}
            className="h-3 w-3 accent-emerald-500"
          />
          <span className="text-xs text-zinc-400">Show acknowledged</span>
        </label>
      </div>
    </div>
  )
}

function StatPill({
  value,
  label,
  colorClass,
}: {
  value: number
  label: string
  colorClass: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium',
        colorClass
      )}
    >
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-xs opacity-80">{label}</span>
    </span>
  )
}
