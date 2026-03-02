// LosFilterBar — Date range + shift preset selector for LoS analytics
// EPIC 10: Management Report Dashboard

'use client'

import { memo, useCallback } from 'react'
import { CalendarDays, Clock, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import type { LosFilters } from '../lib/los-queries'
import {
  SHIFT_PRESETS,
  DATE_RANGE_PRESETS,
  toDateInput,
  makeDatePreset,
} from '../lib/los-filter-presets'

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
      onChange({ ...filters, shiftStartTime: undefined, shiftEndTime: undefined, shiftCrossesMidnight: undefined })
    } else {
      const preset = SHIFT_PRESETS[Number(value)]
      if (preset) {
        onChange({ ...filters, shiftStartTime: preset.start, shiftEndTime: preset.end, shiftCrossesMidnight: preset.crossesMidnight })
      }
    }
  }, [filters, onChange])

  const applyPreset = useCallback((days: number) => {
    onChange({ ...filters, ...makeDatePreset(days) })
  }, [filters, onChange])

  const handleReset = useCallback(() => {
    onChange({ ...makeDatePreset(30) })
  }, [onChange])

  const currentShiftIndex = SHIFT_PRESETS.findIndex(
    (p) => p.start === filters.shiftStartTime && p.end === filters.shiftEndTime,
  )
  const shiftValue = currentShiftIndex === -1 ? 'all' : String(currentShiftIndex)
  const startValue = filters.startDate ? toDateInput(new Date(filters.startDate)) : ''
  const endValue = filters.endDate ? toDateInput(new Date(filters.endDate)) : ''
  const isFiltered = !!filters.startDate || !!filters.endDate || filters.shiftStartTime !== undefined
  const inputClass = cn(
    'bg-muted border border-border rounded px-2 py-1 text-xs text-card-foreground',
    'focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed',
  )

  return (
    <div className={cn('flex items-center gap-3 flex-wrap', className)}>
      <div className="flex items-center gap-1.5 text-card-foreground">
        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
        <input type="date" value={startValue} onChange={handleStartDate}
          disabled={readOnly} max={endValue || undefined} aria-label="Start date" className={inputClass} />
        <span className="text-zinc-600 text-xs">to</span>
        <input type="date" value={endValue} onChange={handleEndDate}
          disabled={readOnly} min={startValue || undefined} aria-label="End date" className={inputClass} />
      </div>

      <div className="flex items-center gap-1.5 text-card-foreground">
        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
        <select value={shiftValue} onChange={handleShiftChange} disabled={readOnly}
          aria-label="Shift filter" className={inputClass}>
          <option value="all">All Shifts</option>
          {SHIFT_PRESETS.map((p, i) => (
            <option key={p.label} value={String(i)}>{p.label}</option>
          ))}
        </select>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-1.5">
          {DATE_RANGE_PRESETS.map(({ label, days }) => (
            <button key={label} onClick={() => applyPreset(days)}
              className={cn('px-2 py-1 rounded text-[10px] border transition-colors',
                'border-border bg-muted text-muted-foreground hover:text-card-foreground hover:border-primary')}>
              {label}
            </button>
          ))}
        </div>
      )}

      {isFiltered && !readOnly && (
        <Button variant="ghost" size="sm" onClick={handleReset}
          className="text-muted-foreground hover:text-card-foreground h-7 px-2" title="Reset to last 30 days">
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          <span className="text-[10px]">Reset</span>
        </Button>
      )}
    </div>
  )
})
