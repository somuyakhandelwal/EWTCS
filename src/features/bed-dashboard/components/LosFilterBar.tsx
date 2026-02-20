// LosFilterBar — Date range + shift preset selector for LoS analytics
// EPIC 10: Management Report Dashboard
// US-10.x: Average Time Patients Spend in Emergency Ward

'use client'

import { memo, useCallback } from 'react'
import { CalendarDays, Clock, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import type { LosFilters } from '../lib/los-queries'

// ── Shift presets ─────────────────────────────────────────────────────────────
// Shift management feature is not yet built; these time-of-day ranges
// mirror the `shiftStartTime`/`shiftEndTime` fields on LosFilters.

type ShiftPreset = {
  label: string
  start: string  // HH:MM:SS
  end: string    // HH:MM:SS
  crossesMidnight: boolean
}

const SHIFT_PRESETS: ShiftPreset[] = [
  { label: 'Morning (08:00–16:00)', start: '08:00:00', end: '16:00:00', crossesMidnight: false },
  { label: 'Evening (16:00–22:00)', start: '16:00:00', end: '22:00:00', crossesMidnight: false },
  { label: 'Night (22:00–08:00)',   start: '22:00:00', end: '08:00:00', crossesMidnight: true  },
]

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Format a Date to YYYY-MM-DD (input[type=date] value format) */
function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function datePresets(daysPast: number): Pick<LosFilters, 'startDate' | 'endDate'> {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - daysPast)
  return { startDate: start, endDate: end }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface LosFilterBarProps {
  filters: LosFilters
  onChange: (filters: LosFilters) => void
  readOnly?: boolean
  className?: string
}

export const LosFilterBar = memo(function LosFilterBar({
  filters,
  onChange,
  readOnly = false,
  className,
}: LosFilterBarProps) {

  const handleStartDate = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, startDate: e.target.value ? new Date(e.target.value) : undefined })
  }, [filters, onChange])

  const handleEndDate = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, endDate: e.target.value ? new Date(e.target.value) : undefined })
  }, [filters, onChange])

  const handleShiftChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === 'all') {
      onChange({
        ...filters,
        shiftStartTime: undefined,
        shiftEndTime: undefined,
        shiftCrossesMidnight: undefined,
      })
    } else {
      const preset = SHIFT_PRESETS[Number(value)]
      if (preset) {
        onChange({
          ...filters,
          shiftStartTime: preset.start,
          shiftEndTime: preset.end,
          shiftCrossesMidnight: preset.crossesMidnight,
        })
      }
    }
  }, [filters, onChange])

  const applyPreset = useCallback((days: number) => {
    onChange({ ...filters, ...datePresets(days) })
  }, [filters, onChange])

  const handleReset = useCallback(() => {
    onChange({ ...datePresets(30) })
  }, [onChange])

  // Determine current shift dropdown value
  const currentShiftIndex = SHIFT_PRESETS.findIndex(
    (p) => p.start === filters.shiftStartTime && p.end === filters.shiftEndTime,
  )
  const shiftValue = currentShiftIndex === -1 ? 'all' : String(currentShiftIndex)

  const startValue = filters.startDate ? toDateInput(new Date(filters.startDate)) : ''
  const endValue   = filters.endDate   ? toDateInput(new Date(filters.endDate))   : ''

  const isFiltered =
    !!filters.startDate || !!filters.endDate || filters.shiftStartTime !== undefined

  return (
    <div className={cn('flex items-center gap-3 flex-wrap', className)}>

      {/* ── Date range ── */}
      <div className="flex items-center gap-1.5 text-zinc-300">
        <CalendarDays className="h-4 w-4 text-zinc-500 shrink-0" />
        <input
          type="date"
          value={startValue}
          onChange={handleStartDate}
          disabled={readOnly}
          max={endValue || undefined}
          aria-label="Start date"
          className={cn(
            'bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200',
            'focus:outline-none focus:ring-1 focus:ring-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        />
        <span className="text-zinc-600 text-xs">to</span>
        <input
          type="date"
          value={endValue}
          onChange={handleEndDate}
          disabled={readOnly}
          min={startValue || undefined}
          aria-label="End date"
          className={cn(
            'bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200',
            'focus:outline-none focus:ring-1 focus:ring-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        />
      </div>

      {/* ── Shift selector ── */}
      <div className="flex items-center gap-1.5 text-zinc-300">
        <Clock className="h-4 w-4 text-zinc-500 shrink-0" />
        <select
          value={shiftValue}
          onChange={handleShiftChange}
          disabled={readOnly}
          aria-label="Shift filter"
          className={cn(
            'bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200',
            'focus:outline-none focus:ring-1 focus:ring-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <option value="all">All Shifts</option>
          {SHIFT_PRESETS.map((p, i) => (
            <option key={p.label} value={String(i)}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Quick date presets ── */}
      {!readOnly && (
        <div className="flex items-center gap-1.5">
          {[
            { label: 'Today',     days: 0 },
            { label: '7 days',    days: 7 },
            { label: '30 days',   days: 30 },
            { label: '90 days',   days: 90 },
          ].map(({ label, days }) => (
            <button
              key={label}
              onClick={() => applyPreset(days)}
              className={cn(
                'px-2 py-1 rounded text-[10px] border transition-colors',
                'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Reset ── */}
      {isFiltered && !readOnly && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-zinc-500 hover:text-zinc-200 h-7 px-2"
          title="Reset to default (last 30 days, all shifts)"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          <span className="text-[10px]">Reset</span>
        </Button>
      )}
    </div>
  )
})
