// Epic 6: US-6.5 temporary (orange) / US-6.6 virtual (purple) beds
// US-4.3: Blinking animation with acknowledge support
import { memo, useState, useEffect, useCallback, type MouseEvent } from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Clock } from 'lucide-react'
import type { BedWithElapsedTime, DispositionDelayReason } from '../types/bed'
import { getStageColorClasses, getDelayColorClasses } from '../lib/utils'
import { useElapsedTime } from '../hooks/useElapsedTime'
import { CleaningActions, isCleaningStage } from './CleaningActions'
import { BedBottleneckInfo } from './BedBottleneckInfo'
import { BedCardVisualBadges } from './BedCardVisualBadges'
import { cn } from '@/shared/lib/utils'
import { highlightMatch } from '../lib/highlight-match'
import { StageIcon } from './StageIcon'

const ACKNOWLEDGE_PAUSE_MS = 30_000

/** Controls which time information is shown on the bed card.
 * - 'nurse'      → "In Stage" (time in current stage, from lastStageChange). Resets on every stage change.
 * - 'supervisor' → Both "In Stage" AND "Patient Total" (total time since admission, from patientStartTime).
 */
export type BedCardViewMode = 'nurse' | 'supervisor'

interface BedCardProps {
  bed: BedWithElapsedTime
  onClick?: (bed: BedWithElapsedTime) => void
  onContextMenu?: (event: MouseEvent<HTMLDivElement>, bed: BedWithElapsedTime) => void
  onReasonSelect?: (bedId: string, reason: DispositionDelayReason) => void
  onMarkClean?: (bedId: string) => void
  isMarkCleanUpdating?: boolean
  showUpdated?: boolean
  errorMessage?: string | null
  searchQuery?: string
  showUndo?: boolean
  onUndo?: () => void
  undoTimerSeconds?: number
  /** True while the undo API call is in-flight — disables button and shows loading label */
  isUndoing?: boolean
  /** US-4.3: Disable animation globally (accessibility setting) */
  animationEnabled?: boolean
  /** Controls which timers are shown. Defaults to 'nurse'. */
  viewMode?: BedCardViewMode
}

export const BedCard = memo(function BedCard({
  bed, onClick, onContextMenu, onReasonSelect, showUpdated = false, errorMessage = null,
  searchQuery = '', showUndo = false, onUndo, undoTimerSeconds = 0, animationEnabled = true,
  isUndoing = false,
}: BedCardProps) {
  const rawStageName = bed.currentStage?.name || 'Empty'
  const stageName = rawStageName === 'Cleaning' ? 'In Cleaning' : rawStageName
  const stageColor = bed.currentStage?.colorCode || 'gray'
  const colorClasses = bed.isDelayed ? getDelayColorClasses(true) : getStageColorClasses(stageColor)
  // Nurse: time in current stage (resets every stage change incl. Empty → Triage)
  const stageTime = useElapsedTime(bed.lastStageChange)
  // Total patient time since admission — shown for all roles
  const patientTotalTime = useElapsedTime(bed.patientStartTime)
  const { isOccupied, isDelayed, isDispositionBottleneck: isBottleneck, isEscalated } = bed
  const isCleaning = isCleaningStage(bed.currentStage?.name)
  const isTemporary = bed.isTemporary
  const isVirtual = bed.isVirtual

  // US-4.3: Acknowledge — pauses animation for 30s, resumes if still delayed
  const [acknowledged, setAcknowledged] = useState(false)
  useEffect(() => { if (!isDelayed) setAcknowledged(false) }, [isDelayed])
  useEffect(() => {
    if (!acknowledged) return
    const t = setTimeout(() => { if (isDelayed) setAcknowledged(false) }, ACKNOWLEDGE_PAUSE_MS)
    return () => clearTimeout(t)
  }, [acknowledged, isDelayed])

  const handleClick = useCallback(() => {
    if (isDelayed && !acknowledged) setAcknowledged(true)
    onClick?.(bed)
  }, [isDelayed, acknowledged, onClick, bed])

  const showPulse = animationEnabled && !acknowledged
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Bed ${bed.bedNumber}, ${stageName}${isOccupied ? ', Occupied' : ', Available'}${isDelayed ? ', Delayed' : ''}${isEscalated ? ', Escalated' : ''}${isBottleneck ? ', Disposition Bottleneck' : ''}`}
      className={cn(
        'relative overflow-hidden transition-all cursor-pointer sm:hover:scale-105 sm:hover:shadow-lg active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        colorClasses.bg,
        colorClasses.border,
        'border-2',
        isVirtual && 'ring-2 ring-status-virtual border-status-virtual',
        isTemporary && !isVirtual && 'ring-2 ring-status-temporary border-status-temporary',
        isDelayed && !isEscalated && 'ring-2 ring-destructive',
        isDelayed && !isEscalated && showPulse && 'animate-pulse-slow',
        isEscalated && 'ring-2 ring-status-escalated animate-glow-escalated',
        isBottleneck && !isDelayed && !isEscalated && 'ring-2 ring-status-cleaning',
        isBottleneck && !isDelayed && !isEscalated && showPulse && 'animate-pulse-slow',
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      onContextMenu={(e) => onContextMenu?.(e, bed)}
    >
      <BedCardVisualBadges
        isVirtual={isVirtual}
        isTemporary={isTemporary}
        isEscalated={isEscalated}
        isDelayed={isDelayed}
        isBottleneck={isBottleneck}
        acknowledged={acknowledged}
      />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={cn('text-2xl font-bold', colorClasses.text)}>
            {highlightMatch(bed.bedNumber, searchQuery)}
          </h3>
          {isOccupied && !isDelayed && (
            <div className="flex h-2 w-2" role="status" aria-label="Occupied active indicator">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Stage</p>
          <div className="flex items-center gap-1.5">
            <StageIcon colorCode={stageColor} className={cn('h-4 w-4', colorClasses.text)} />
            <p className={cn('text-sm font-semibold', colorClasses.text)}>{highlightMatch(stageName, searchQuery)}</p>
          </div>
          {onContextMenu && <p className="text-[10px] text-muted-foreground">Tap or right-click to update stage</p>}
          {showUpdated && <p className="text-[10px] text-status-occupied" role="status">Updated</p>}
          {errorMessage && <p className="text-[10px] text-destructive" role="alert">{errorMessage}</p>}
          {showUndo && onUndo && (
            <div className="mt-2 flex items-center gap-2">
              <button
                className="px-3 py-1 bg-primary hover:opacity-90 text-primary-foreground text-xs rounded transition-colors font-semibold shadow focus:ring-2 focus:ring-ring focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={e => { e.stopPropagation(); onUndo(); }}
                disabled={isUndoing}
                aria-label={isUndoing ? 'Undoing…' : `Undo last action (expires in ${undoTimerSeconds} seconds)`}
              >{isUndoing ? 'Undoing…' : 'Undo'}</button>
              {!isUndoing && (
                <span className="text-xs text-muted-foreground" aria-hidden="true">({undoTimerSeconds}s)</span>
              )}
            </div>
          )}
          {isBottleneck && (
            <BedBottleneckInfo
              bedId={bed.id}
              dispositionElapsedMs={bed.dispositionElapsedMs}
              dispositionDelayReason={bed.dispositionDelayReason}
              onReasonSelect={onReasonSelect}
            />
          )}
        </div>

        {isOccupied && bed.lastStageChange && (
          <div className="pt-2 border-t border-border space-y-2">
            {/* In Stage timer — shown for both nurse and supervisor */}
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
            {/* Patient Total — shown for all roles */}
            {bed.patientStartTime && (
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
        )}
        {isCleaning && <CleaningActions lastStageChange={bed.lastStageChange} />}
        {!isOccupied && !isCleaning && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-sm font-medium text-muted-foreground">Available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
})