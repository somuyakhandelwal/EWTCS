// Bed Card Component
// Epic 1: Nurse Desk Bed Dashboard
// Epic 6: US-6.5 — temporary (surge) beds shown with orange badge + border
//          US-6.6 — virtual (hallway/stretcher) beds shown with purple badge + border
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
  /** US-4.3: Disable animation globally (accessibility setting) */
  animationEnabled?: boolean
}

export const BedCard = memo(function BedCard({
  bed, onClick, onContextMenu, onReasonSelect,
  showUpdated = false, errorMessage = null,
  searchQuery = '', showUndo = false, onUndo, undoTimerSeconds = 0,
  animationEnabled = true,
}: BedCardProps) {
  const rawStageName = bed.currentStage?.name || 'Empty'
  const stageName = rawStageName === 'Cleaning' ? 'In Cleaning' : rawStageName
  const stageColor = bed.currentStage?.colorCode || 'gray'
  const colorClasses = bed.isDelayed ? getDelayColorClasses(true) : getStageColorClasses(stageColor)
  const elapsedTime = useElapsedTime(bed.patientStartTime)
  const { isOccupied, isDelayed, isEscalated, isDispositionBottleneck: isBottleneck } = bed
  const isCleaning = isCleaningStage(bed.currentStage?.name)
  const isTemporary = bed.isTemporary
  const isVirtual = bed.isVirtual

  // US-4.3: Acknowledge — pauses animation for 30s, resumes if still delayed
  const [acknowledged, setAcknowledged] = useState(false)
  useEffect(() => { if (!isDelayed && !isEscalated) setAcknowledged(false) }, [isDelayed, isEscalated])
  useEffect(() => {
    if (!acknowledged) return
    const t = setTimeout(() => { if (isDelayed || isEscalated) setAcknowledged(false) }, ACKNOWLEDGE_PAUSE_MS)
    return () => clearTimeout(t)
  }, [acknowledged, isDelayed, isEscalated])

  const handleClick = useCallback(() => {
    if ((isDelayed || isEscalated) && !acknowledged) setAcknowledged(true)
    onClick?.(bed)
  }, [isDelayed, isEscalated, acknowledged, onClick, bed])

  const showPulse = animationEnabled && !acknowledged
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Bed ${bed.bedNumber}, ${stageName}${isOccupied ? ', Occupied' : ', Available'}${isDelayed ? ', Delayed' : ''}${isEscalated ? ', Escalated' : ''}${isBottleneck ? ', Disposition Bottleneck' : ''}`}
      className={cn(
        'relative overflow-hidden transition-all cursor-pointer sm:hover:scale-105 sm:hover:shadow-lg active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        colorClasses.bg,
        colorClasses.border,
        'border-2',
        isVirtual && 'ring-2 ring-purple-500 border-purple-700',
        isTemporary && !isVirtual && 'ring-2 ring-orange-500 border-orange-700',
        isDelayed && !isEscalated && 'ring-2 ring-red-500',
        isEscalated && 'ring-2 ring-fuchsia-500',
        (isDelayed || isEscalated) && showPulse && 'motion-safe:animate-pulse',
        isBottleneck && !isDelayed && !isEscalated && 'ring-2 ring-amber-500',
        isBottleneck && !isDelayed && !isEscalated && showPulse && 'motion-safe:animate-pulse',
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
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Current Stage</p>
          <div className="flex items-center gap-1.5">
            <StageIcon colorCode={stageColor} className={cn('h-4 w-4', colorClasses.text)} />
            <p className={cn('text-sm font-semibold', colorClasses.text)}>{highlightMatch(stageName, searchQuery)}</p>
          </div>
          {onContextMenu && <p className="text-[10px] text-zinc-500">Tap or right-click to update stage</p>}
          {showUpdated && <p className="text-[10px] text-emerald-400" role="status">Updated</p>}
          {errorMessage && <p className="text-[10px] text-red-400" role="alert">{errorMessage}</p>}
          {showUndo && onUndo && (
            <div className="mt-2 flex items-center gap-2">
              <button
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors font-semibold shadow focus:ring-2 focus:ring-blue-400 focus:outline-none"
                onClick={e => { e.stopPropagation(); onUndo(); }}
                aria-label={`Undo last action (expires in ${undoTimerSeconds} seconds)`}
              >Undo</button>
              <span className="text-xs text-zinc-400" aria-hidden="true">({undoTimerSeconds}s)</span>
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

        {isOccupied && bed.patientStartTime && (
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-700/50">
            <Clock className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-xs text-zinc-500">Elapsed Time</p>
              <p className={cn('text-lg font-bold', isDelayed ? 'text-red-400' : 'text-zinc-300')} aria-label={`Elapsed time: ${elapsedTime}`}>
                {elapsedTime}
              </p>
            </div>
          </div>
        )}
        {isCleaning && (
          <CleaningActions
            lastStageChange={bed.lastStageChange} />
        )}
        {!isOccupied && !isCleaning && (
          <div className="pt-2 border-t border-zinc-700/50">
            <p className="text-xs text-zinc-500">Status</p>
            <p className="text-sm font-medium text-zinc-400">Available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
})