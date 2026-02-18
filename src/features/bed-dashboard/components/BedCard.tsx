// Bed Card Component
// Epic 1: Nurse Desk Bed Dashboard

import { memo, type MouseEvent } from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Clock, AlertTriangle, Hourglass } from 'lucide-react'
import type { BedWithElapsedTime, DispositionDelayReason } from '../types/bed'
import { DISPOSITION_DELAY_REASON_LABELS } from '../types/bed'
import { formatElapsedTime, getStageColorClasses } from '../lib/utils'
import { cn } from '@/shared/lib/utils'

const REASON_OPTIONS = Object.entries(DISPOSITION_DELAY_REASON_LABELS) as [
  DispositionDelayReason,
  string,
][]

interface BedCardProps {
  bed: BedWithElapsedTime
  onClick?: (bed: BedWithElapsedTime) => void
  onContextMenu?: (event: MouseEvent<HTMLDivElement>, bed: BedWithElapsedTime) => void
  onReasonSelect?: (bedId: string, reason: DispositionDelayReason) => void
  showUpdated?: boolean
  errorMessage?: string | null
}

export const BedCard = memo(function BedCard({
  bed,
  onClick,
  onContextMenu,
  onReasonSelect,
  showUpdated = false,
  errorMessage = null,
}: BedCardProps) {
  const stageName = bed.currentStage?.name || 'Empty'
  const stageColor = bed.currentStage?.colorCode || 'gray'
  const colorClasses = getStageColorClasses(stageColor)
  const elapsedTime = formatElapsedTime(bed.elapsedTimeMs)
  const isOccupied = bed.isOccupied
  const isDelayed = bed.isDelayed
  const isBottleneck = bed.isDispositionBottleneck

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all cursor-pointer hover:scale-105 hover:shadow-lg',
        colorClasses.bg,
        colorClasses.border,
        'border-2',
        isDelayed && 'ring-2 ring-red-500 animate-pulse',
        // US-1.6: amber ring for disposition bottleneck (takes priority over delayed ring)
        isBottleneck && 'ring-2 ring-amber-500 animate-pulse'
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

      {/* US-1.6: Disposition bottleneck indicator (overrides delay icon) */}
      {isBottleneck && (
        <div className="absolute top-2 right-2">
          <Hourglass className="h-5 w-5 text-amber-400" />
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        {/* Bed Number */}
        <div className="flex items-center justify-between">
          <h3 className={cn('text-2xl font-bold', colorClasses.text)}>
            {bed.bedNumber}
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
            {stageName}
          </p>
          {onContextMenu && (
            <p className="text-[10px] text-zinc-500">
              Right-click to update stage
            </p>
          )}
          {showUpdated && (
            <p className="text-[10px] text-emerald-400">Updated</p>
          )}
          {errorMessage && (
            <p className="text-[10px] text-red-400">{errorMessage}</p>
          )}

          {/* US-1.6: Disposition bottleneck badge */}
          {isBottleneck && (
            <div className="mt-1 flex items-center gap-1 rounded bg-amber-900/40 border border-amber-700/50 px-2 py-0.5">
              <Hourglass className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="text-[10px] font-semibold text-amber-300">
                Disposition Hold · {formatElapsedTime(bed.dispositionElapsedMs)}
              </span>
            </div>
          )}

          {/* US-1.7: Inline reason selector when bottleneck and handler provided */}
          {isBottleneck && onReasonSelect && (
            <select
              className={cn(
                'mt-1 w-full rounded border border-amber-700/50 bg-zinc-900 px-1.5 py-1 text-[10px] text-zinc-200',
                'focus:outline-none focus:ring-1 focus:ring-amber-500'
              )}
              value={bed.dispositionDelayReason ?? ''}
              onClick={e => e.stopPropagation()}
              onChange={e => {
                e.stopPropagation()
                onReasonSelect(bed.id, e.target.value as DispositionDelayReason)
              }}
            >
              <option value="" disabled>Select reason…</option>
              {REASON_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          )}
          {/* US-1.6: Show recorded reason label when no handler (read-only) */}
          {isBottleneck && !onReasonSelect && bed.dispositionDelayReason && (
            <p className="text-[10px] text-amber-400/80">
              {DISPOSITION_DELAY_REASON_LABELS[bed.dispositionDelayReason]}
            </p>
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

        {/* Empty bed status */}
        {!isOccupied && (
          <div className="pt-2 border-t border-zinc-700/50">
            <p className="text-xs text-zinc-500">Status</p>
            <p className="text-sm font-medium text-zinc-400">Available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
