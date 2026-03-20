import { memo } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useElapsedTime } from '../hooks/useElapsedTime'

/**
 * BedCardTimers component: US-1.2, US-15.3
 * Displays the current stage timer and total patient elapsed time for a bed card.
 */
interface BedCardTimersProps {
  /** The timestamp of the last stage change (used for "In Stage" timer) */
  lastStageChange: Date | string | null | undefined
  /** The timestamp when the patient was admitted (used for "Patient Total" timer) */
  patientStartTime: Date | string | null | undefined
  /** Whether the bed is currently delayed/escalated (determines color coding) */
  isDelayed: boolean
}

/**
 * Component to render stage and patient-level timers with automatic minute-level updates.
 */
export const BedCardTimers = memo(function BedCardTimers({
  lastStageChange,
  patientStartTime,
  isDelayed,
}: BedCardTimersProps) {
  const stageTime = useElapsedTime(lastStageChange)
  const patientTotalTime = useElapsedTime(patientStartTime)

  if (!lastStageChange) return null

  return (
    <div className="pt-2 border-t border-border space-y-2">
      {/* In Stage timer */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">In Stage</p>
          <p
            className={cn('text-lg font-bold', isDelayed ? 'text-destructive' : 'text-foreground')}
            aria-label={`Time in current stage: ${stageTime}`}
            suppressHydrationWarning
          >
            {stageTime}
          </p>
        </div>
      </div>
      {/* Patient Total */}
      {patientStartTime && (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Patient Total</p>
            <p
              className={cn('text-sm font-semibold', isDelayed ? 'text-destructive' : 'text-muted-foreground')}
              aria-label={`Total patient time: ${patientTotalTime}`}
              suppressHydrationWarning
            >
              {patientTotalTime}
            </p>
          </div>
        </div>
      )}
    </div>
  )
})
