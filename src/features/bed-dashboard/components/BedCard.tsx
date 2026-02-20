// Bed Card Component
// Epic 1: Nurse Desk Bed Dashboard
// Epic 6: US-6.5 — temporary (surge) beds shown with orange badge + border
//          US-6.6 — virtual (hallway/stretcher) beds shown with purple badge + border
// US-4.3: Blinking animation with acknowledge support
import { memo, useState, useEffect, useCallback, type MouseEvent } from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Clock, AlertTriangle, Hourglass, Zap, MapPin } from 'lucide-react'
import type { BedWithElapsedTime, DispositionDelayReason } from '../types/bed'
import { getStageColorClasses, getDelayColorClasses } from '../lib/utils'
import { useElapsedTime } from '../hooks/useElapsedTime'
import { CleaningActions, isCleaningStage } from './CleaningActions'
import { BedBottleneckInfo } from './BedBottleneckInfo'
import { cn } from '@/shared/lib/utils'
import { highlightMatch } from '../lib/highlight-match'

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
  bed, onClick, onContextMenu, onReasonSelect, onMarkClean,
  isMarkCleanUpdating = false, showUpdated = false, errorMessage = null,
  searchQuery = '', showUndo = false, onUndo, undoTimerSeconds = 0,
  animationEnabled = true,
}: BedCardProps) {
  const stageName = bed.currentStage?.name || 'Empty'
  const stageColor = bed.currentStage?.colorCode || 'gray'
  const colorClasses = bed.isDelayed ? getDelayColorClasses(true) : getStageColorClasses(stageColor)
  const elapsedTime = useElapsedTime(bed.patientStartTime)
  const { isOccupied, isDelayed, isDispositionBottleneck: isBottleneck } = bed
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
      className={cn(
        'relative overflow-hidden transition-all cursor-pointer sm:hover:scale-105 sm:hover:shadow-lg active:scale-[0.97]',
        colorClasses.bg,
        colorClasses.border,
        'border-2',
        isVirtual && 'ring-2 ring-purple-500 border-purple-700',
        isTemporary && !isVirtual && 'ring-2 ring-orange-500 border-orange-700',
        isDelayed && 'ring-2 ring-red-500',
        isDelayed && showPulse && 'motion-safe:animate-pulse',
        isBottleneck && !isDelayed && 'ring-2 ring-amber-500',
        isBottleneck && !isDelayed && showPulse && 'motion-safe:animate-pulse',
      )}
      onClick={handleClick}
      onContextMenu={(e) => onContextMenu?.(e, bed)}
    >
      {/* US-6.6: Virtual / hallway bed badge — shown instead of Surge when isVirtual */}
      {isVirtual && (
        <div className="absolute top-0 left-0 flex items-center gap-0.5 rounded-br bg-purple-700/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-purple-100">
          <MapPin className="h-2.5 w-2.5" />
          Virtual
        </div>
      )}
      {/* US-6.5: Temporary / surge bed badge — only shown when not virtual */}
      {isTemporary && !isVirtual && (
        <div className="absolute top-0 left-0 flex items-center gap-0.5 rounded-br bg-orange-700/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-100">
          <Zap className="h-2.5 w-2.5" />
          Surge
        </div>
      )}
      {isDelayed && !isBottleneck && (
        <div className="absolute top-2 right-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
      )}
      {isDelayed && acknowledged && (
        <div className="absolute top-2 left-2">
          <span className="text-[9px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">Acknowledged</span>
        </div>
      )}
      {isBottleneck && (
        <div className="absolute top-2 right-2">
          <Hourglass className="h-5 w-5 text-amber-400" />
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={cn('text-2xl font-bold', colorClasses.text)}>
            {highlightMatch(bed.bedNumber, searchQuery)}
          </h3>
          {isOccupied && !isDelayed && (
            <div className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Current Stage</p>
          <p className={cn('text-sm font-semibold', colorClasses.text)}>{highlightMatch(stageName, searchQuery)}</p>
          {onContextMenu && <p className="text-[10px] text-zinc-500">Tap or right-click to update stage</p>}
          {showUpdated && <p className="text-[10px] text-emerald-400">Updated</p>}
          {errorMessage && <p className="text-[10px] text-red-400">{errorMessage}</p>}
          {showUndo && onUndo && (
            <div className="mt-2 flex items-center gap-2">
              <button
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors font-semibold shadow"
                onClick={e => { e.stopPropagation(); onUndo(); }}
              >Undo</button>
              <span className="text-xs text-zinc-400">({undoTimerSeconds}s)</span>
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
            <Clock className="h-4 w-4 text-zinc-500" />
            <div className="flex-1">
              <p className="text-xs text-zinc-500">Elapsed Time</p>
              <p className={cn('text-lg font-bold', isDelayed ? 'text-red-400' : 'text-zinc-300')}>{elapsedTime}</p>
            </div>
          </div>
        )}

        {isCleaning && (
  <CleaningActions
    lastStageChange={bed.lastStageChange}
  />
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