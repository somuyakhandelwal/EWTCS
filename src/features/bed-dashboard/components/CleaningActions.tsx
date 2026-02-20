// Cleaning Actions Component
// US-2.4: Track Bed Cleaning and Turnaround Time
// Shows "Mark Clean" button and timer for beds in Cleaning stage

'use client'

import { memo } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Sparkles, Loader2, Timer } from 'lucide-react'
import { formatElapsedTime } from '../lib/utils'
import { cn } from '@/shared/lib/utils'

interface CleaningActionsProps {
  bedId: string
  lastStageChange: Date | null
  onMarkClean: (bedId: string) => void
  isUpdating: boolean
}

/**
 * Check if a stage name represents the Cleaning stage
 */
export function isCleaningStage(stageName: string | undefined | null): boolean {
  if (!stageName) return false
  return stageName.trim().toLowerCase() === 'cleaning'
}

export const CleaningActions = memo(function CleaningActions({
  bedId,
  lastStageChange,
  onMarkClean,
  isUpdating,
}: CleaningActionsProps) {
  const cleaningDurationMs = lastStageChange
    ? Date.now() - new Date(lastStageChange).getTime()
    : null

  return (
    <div className="space-y-2 pt-2 border-t border-zinc-700/50">
      {/* Cleaning duration timer */}
      {cleaningDurationMs !== null && (
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-pink-400" />
          <div className="flex-1">
            <p className="text-[10px] text-zinc-500 uppercase">
              Cleaning Duration
            </p>
            <p className={cn(
              'text-sm font-bold text-pink-300',
            )}>
              {formatElapsedTime(cleaningDurationMs)}
            </p>
          </div>
        </div>
      )}

      {/* Mark Clean button */}
      <Button
        size="sm"
        variant="outline"
        className={cn(
          'w-full gap-2 border-emerald-700 text-emerald-400',
          'hover:bg-emerald-900/30 hover:text-emerald-300',
        )}
        disabled={isUpdating}
        onClick={(e) => {
          e.stopPropagation()
          onMarkClean(bedId)
        }}
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isUpdating ? 'Updating...' : 'Ready for Next Patient'}
      </Button>
    </div>
  )
})
