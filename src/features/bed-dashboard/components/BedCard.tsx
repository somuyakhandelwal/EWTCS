// Bed Card Component
// Epic 1: Nurse Desk Bed Dashboard

import { memo, type MouseEvent } from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Clock, AlertTriangle, Hourglass } from 'lucide-react'
import type { BedWithElapsedTime, DispositionDelayReason } from '../types/bed'
import { getStageColorClasses, getDelayColorClasses } from '../lib/utils'
import { useElapsedTime } from '../hooks/useElapsedTime'
import { CleaningActions, isCleaningStage } from './CleaningActions'
import { BedBottleneckInfo } from './BedBottleneckInfo'
import { cn } from '@/shared/lib/utils'
import { highlightMatch } from '../lib/highlight-match'

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
}

export const BedCard = memo(function BedCard({
  bed,
  onClick,
  onContextMenu,
  onReasonSelect,
  onMarkClean,
  isMarkCleanUpdating = false,
  showUpdated = false,
  errorMessage = null,
  searchQuery = '',
  showUndo = false,
  onUndo,
  undoTimerSeconds = 0,
}: BedCardProps) {
  const stageName = bed.currentStage?.name || 'Empty'
  const stageColor = bed.currentStage?.colorCode || 'gray'
  const colorClasses = bed.isDelayed ? getDelayColorClasses(true) : getStageColorClasses(stageColor)
  const elapsedTime = useElapsedTime(bed.patientStartTime)
  const isOccupied = bed.isOccupied
  const isDelayed = bed.isDelayed
  const isBottleneck = bed.isDispositionBottleneck
  const isCleaning = isCleaningStage(bed.currentStage?.name)

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all cursor-pointer sm:hover:scale-105 sm:hover:shadow-lg active:scale-[0.97]',
        colorClasses.bg,
        colorClasses.border,
        'border-2',
        isDelayed && 'ring-2 ring-red-500 motion-safe:animate-pulse',
        isBottleneck && !isDelayed && 'ring-2 ring-amber-500 motion-safe:animate-pulse'
      )}
      onClick={() => onClick?.(bed)}
      onContextMenu={(event) => onContextMenu?.(event, bed)}
    >
      {/* Delay indicator */}
      {isDelayed && !isBottleneck && (
        <div className="absolute top-2 right-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
      )}

      {/* US-1.6: Disposition bottleneck indicator */}
      {isBottleneck && (
        <div className="absolute top-2 right-2">
          <Hourglass className="h-5 w-5 text-amber-400" />
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        {/* Bed Number */}
        <div className="flex items-center justify-between">
          <h3 className={cn('text-2xl font-bold', colorClasses.text)}>
            {highlightMatch(bed.bedNumber, searchQuery)}
          </h3>
          {isOccupied && !isDelayed && (
            <div className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
          )}
        </div>

        {/* Stage Name */}
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Current Stage</p>
          <p className={cn('text-sm font-semibold', colorClasses.text)}>
            {highlightMatch(stageName, searchQuery)}
          </p>
          {onContextMenu && (
            <p className="text-[10px] text-zinc-500">
              Tap or right-click to update stage
            </p>
          )}
          {showUpdated && (
            <p className="text-[10px] text-emerald-400">Updated</p>
          )}
          {errorMessage && (
            <p className="text-[10px] text-red-400">{errorMessage}</p>
          )}
          {/* Undo Button (inline) */}
          {showUndo && onUndo && (
            <div className="mt-2 flex items-center gap-2">
              <button
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors font-semibold shadow"
                onClick={e => { e.stopPropagation(); onUndo(); }}
              >
                Undo
              </button>
              <span className="text-xs text-zinc-400">({undoTimerSeconds}s)</span>
            </div>
          )}

          {/* US-1.6 / US-1.7: Bottleneck badge + reason selector */}
          {isBottleneck && (
            <BedBottleneckInfo
              bedId={bed.id}
              dispositionElapsedMs={bed.dispositionElapsedMs}
              dispositionDelayReason={bed.dispositionDelayReason}
              onReasonSelect={onReasonSelect}
            />
          )}
        </div>

        {/* Elapsed Time */}
        {isOccupied && bed.patientStartTime && (
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-700/50">
            <Clock className="h-4 w-4 text-zinc-500" />
            <div className="flex-1">
              <p className="text-xs text-zinc-500">Elapsed Time</p>
              <p className={cn(
                'text-lg font-bold',
                isDelayed ? 'text-red-400' : 'text-zinc-300'
              )}>
                {elapsedTime}
              </p>
            </div>
          </div>
        )}

        {/* US-2.4: Cleaning actions */}
        {isCleaning && onMarkClean && (
          <CleaningActions
            bedId={bed.id}
            lastStageChange={bed.lastStageChange}
            onMarkClean={onMarkClean}
            isUpdating={isMarkCleanUpdating}
          />
        )}

        {/* Empty bed status */}
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