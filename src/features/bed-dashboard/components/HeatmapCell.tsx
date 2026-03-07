'use client'

// HeatmapCell — a single interactive cell in the staffing heatmap grid
// EPIC 10: Management Report Dashboard

import { cn } from '@/shared/lib/utils'

interface HeatmapCellProps {
  /** Admission count for this DOW × hour slot */
  count:    number
  /** Highest count in the whole dataset — used to normalise colour intensity */
  maxCount: number
  /** Accessible tooltip label, e.g. "Mon 09:00" */
  label:    string
  /** Called when the user clicks to drill down */
  onClick:  () => void
}

/**
 * Maps a 0–1 intensity ratio to a Tailwind background + hover class.
 * Uses the blue-* palette to match the dark dashboard theme.
 */
function intensityClass(intensity: number): string {
  if (intensity === 0)    return 'bg-card  hover:bg-muted'
  if (intensity <= 0.15)  return 'bg-blue-950  hover:bg-blue-900'
  if (intensity <= 0.30)  return 'bg-blue-900  hover:bg-blue-800'
  if (intensity <= 0.45)  return 'bg-blue-800  hover:bg-blue-700'
  if (intensity <= 0.60)  return 'bg-blue-700  hover:bg-blue-600'
  if (intensity <= 0.75)  return 'bg-blue-600  hover:bg-blue-500'
  if (intensity <= 0.90)  return 'bg-blue-500  hover:bg-blue-400'
  return                         'bg-blue-400  hover:bg-blue-300'
}

export function HeatmapCell({ count, maxCount, label, onClick }: HeatmapCellProps) {
  const intensity = maxCount > 0 ? count / maxCount : 0

  return (
    <button
      title={`${label}: ${count} admission${count === 1 ? '' : 's'}`}
      aria-label={`${label}: ${count} admissions, click to drill down`}
      onClick={onClick}
      className={cn(
        'w-full aspect-square rounded-sm transition-colors text-[9px] font-semibold',
        'flex items-center justify-center leading-none',
        intensityClass(intensity),
        count > 0 ? 'text-foreground' : 'text-transparent'
      )}
    >
      {count > 0 ? count : null}
    </button>
  )
}
