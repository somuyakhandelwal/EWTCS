'use client'
// BedPerformanceToolbar — US-10.4
// Preset date buttons, shift selector, and refresh control for BedPerformanceView.

import { Button } from '@/shared/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { Shift } from '@/features/shift-management/types/shift.types'
import { formatShiftTime } from '@/features/shift-management/lib/shift-format'
import { PRESETS } from '../hooks/useBedPerformanceData'
import type { DateRangePreset } from '../types/report.types'

interface BedPerformanceToolbarProps {
  preset: DateRangePreset
  setPreset: (p: DateRangePreset) => void
  shifts: Shift[]
  selectedShiftId: string
  setSelectedShiftId: (id: string) => void
  loading: boolean
  readOnly: boolean
  onReload: () => void
}

export function BedPerformanceToolbar({
  preset,
  setPreset,
  shifts,
  selectedShiftId,
  setSelectedShiftId,
  loading,
  readOnly,
  onReload,
}: BedPerformanceToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <Button
          key={p.value}
          size="sm"
          variant={preset === p.value ? 'default' : 'outline'}
          onClick={() => setPreset(p.value)}
        >
          {p.label}
        </Button>
      ))}

      {shifts.length > 0 && (
        <select
          value={selectedShiftId}
          onChange={(e) => setSelectedShiftId(e.target.value)}
          className={cn(
            'h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1',
            'text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
        >
          <option value="all">All Shifts</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({formatShiftTime(s.start_time, s.end_time)})
            </option>
          ))}
        </select>
      )}

      <Button
        size="sm"
        variant="ghost"
        onClick={onReload}
        disabled={loading || readOnly}
        title="Refresh"
      >
        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
      </Button>
    </div>
  )
}
