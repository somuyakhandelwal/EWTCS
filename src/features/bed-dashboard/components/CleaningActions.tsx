// Cleaning Actions Component
// US-2.4: Track Bed Cleaning and Turnaround Time
// Shows "Mark Clean" button and timer for beds in Cleaning stage

'use client'

import { memo, useEffect, useState } from 'react'
import { Timer } from 'lucide-react'
import { formatElapsedTime } from '../lib/utils'
import { cn } from '@/shared/lib/utils'

interface CleaningActionsProps {
  lastStageChange: Date | null
}

/**
 * Check if a stage name represents the Cleaning stage
 */
export function isCleaningStage(stageName: string | undefined | null): boolean {
  if (!stageName) return false
  return stageName.trim().toLowerCase() === 'cleaning'
}

export const CleaningActions = memo(function CleaningActions({
  lastStageChange,
}: CleaningActionsProps) {
  // Keep cleaningDurationMs as null during SSR to avoid hydration mismatch.
  // Date.now() changes every millisecond, so computing it server-side produces
  // a different aria-label than the client recomputes during hydration.
  const [cleaningDurationMs, setCleaningDurationMs] = useState<number | null>(null)

  useEffect(() => {
    if (!lastStageChange) return
    const startMs = new Date(lastStageChange).getTime()
    // Calculate immediately, then refresh every second for a live timer
    const tick = () => setCleaningDurationMs(Date.now() - startMs)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lastStageChange])

  if (cleaningDurationMs === null) return null

  return (
    <div className="pt-2 border-t border-border">
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-pink-400" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground uppercase">Cleaning Duration</p>
          <p className={cn('text-sm font-bold text-pink-300')} aria-label={`Cleaning duration: ${formatElapsedTime(cleaningDurationMs)}`}>
            {formatElapsedTime(cleaningDurationMs)}
          </p>
        </div>
      </div>
    </div>
  )
})

