'use client'
// DateRangePicker — EPIC 11 (US-11.3)
// Reusable date-range picker with preset buttons and a custom date input pair.
// Default range: Last 30 days. Styled to match the app's dark theme.
// No external UI library required — uses native <input type="date">.

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import type { ResolvedDateRange } from '../types/export.types'

// ---------------------------------------------------------------------------
// Preset helpers
// ---------------------------------------------------------------------------

interface Preset {
  label: string
  value: string
  days: number
}

export const DATE_PRESETS: Preset[] = [
  { label: 'Last 24h', value: '1d',  days: 1 },
  { label: 'Last 7d',  value: '7d',  days: 7 },
  { label: 'Last 30d', value: '30d', days: 30 },
  { label: 'Custom',   value: 'custom', days: 0 },
]

/** Format a Date as YYYY-MM-DD using LOCAL timezone (matching <input type="date"> values). */
function toInputDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Compute a ResolvedDateRange from a preset value.
 * For 'custom' the caller should use the explicit startDate / endDate inputs.
 */
export function resolvePreset(
  presetValue: string,
  customStart: string,
  customEnd: string
): ResolvedDateRange {
  const now = new Date()

  if (presetValue !== 'custom') {
    const preset = DATE_PRESETS.find((p) => p.value === presetValue) ?? DATE_PRESETS[2]
    const start = new Date(now.getTime() - preset.days * 86_400_000)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    return {
      startDate: start,
      endDate: end,
      label: preset.label,
    }
  }

  // Custom range
  const start = customStart ? new Date(customStart + 'T00:00:00') : new Date(now.getTime() - 30 * 86_400_000)
  const end = customEnd ? new Date(customEnd + 'T23:59:59.999') : new Date(now)
  const label = `${toInputDate(start)} to ${toInputDate(end)}`
  return { startDate: start, endDate: end, label }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface DateRangePickerProps {
  /** Called every time the selection changes with the fully resolved range. */
  onChange: (range: ResolvedDateRange) => void
  /** Initial preset (defaults to '30d' per US-11.3 AC). */
  defaultPreset?: string
  disabled?: boolean
  className?: string
}

export function DateRangePicker({
  onChange,
  defaultPreset = '30d',
  disabled = false,
  className,
}: DateRangePickerProps) {
  const [preset, setPreset] = useState(defaultPreset)

  // Custom date input values (YYYY-MM-DD strings)
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date(Date.now() - 30 * 86_400_000)
    return toInputDate(d)
  })
  const [customEnd, setCustomEnd] = useState<string>(() => toInputDate(new Date()))

  const emit = useCallback(
    (p: string, cs: string, ce: string) => {
      onChange(resolvePreset(p, cs, ce))
    },
    [onChange]
  )

  // Emit initial value on mount
  useEffect(() => {
    emit(preset, customStart, customEnd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePreset = (value: string) => {
    setPreset(value)
    emit(value, customStart, customEnd)
  }

  const handleCustomStart = (value: string) => {
    setCustomStart(value)
    if (preset === 'custom') emit('custom', value, customEnd)
  }

  const handleCustomEnd = (value: string) => {
    setCustomEnd(value)
    if (preset === 'custom') emit('custom', customStart, value)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {DATE_PRESETS.map((p) => (
          <Button
            key={p.value}
            type="button"
            size="sm"
            variant={preset === p.value ? 'default' : 'outline'}
            onClick={() => handlePreset(p.value)}
            disabled={disabled}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Custom date inputs — visible only when 'custom' is selected */}
      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">From</label>
            <input
              type="date"
              value={customStart}
              max={customEnd || toInputDate(new Date())}
              onChange={(e) => handleCustomStart(e.target.value)}
              disabled={disabled}
              className={cn(
                'h-9 rounded-md border border-border bg-card px-3 py-1',
                'text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500',
                'disabled:opacity-50'
              )}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">To</label>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              max={toInputDate(new Date())}
              onChange={(e) => handleCustomEnd(e.target.value)}
              disabled={disabled}
              className={cn(
                'h-9 rounded-md border border-border bg-card px-3 py-1',
                'text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500',
                'disabled:opacity-50'
              )}
            />
          </div>
        </div>
      )}

      {/* Resolved range display */}
      {preset !== 'custom' && (
        <p className="text-xs text-muted-foreground">
          {resolvePreset(preset, customStart, customEnd).label}
        </p>
      )}
    </div>
  )
}
