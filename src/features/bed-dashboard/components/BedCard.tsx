// Bed Card Component
// Epic 1: Nurse Desk Bed Dashboard

import { memo, type MouseEvent } from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Clock, Hourglass } from 'lucide-react'
import type { BedWithElapsedTime, DispositionDelayReason } from '../types/bed'
import { DISPOSITION_DELAY_REASON_LABELS } from '../types/bed'
import { formatElapsedTime, getStageColorClasses } from '../lib/utils'
import { useElapsedTime } from '../hooks/useElapsedTime'
import { cn } from '@/shared/lib/utils'
import { BedStatusIndicators } from './BedStatusIndicators'
import { BedHeader } from './BedHeader'

const REASON_OPTIONS = Object.entries(DISPOSITION_DELAY_REASON_LABELS) as [
  DispositionDelayReason,
  string,
][]

/**
 * BedCard Component
 * 
 * Represents a single bed in the dashboard grid.
 * Displays critical information including:
 * - Bed number
 * - Current stage and color coding
 * - Occupancy status
 * - Elapsed time since admission
 * - Delays and Bottlenecks (visually highlighted)
 * 
 * Interactions:
 * - Click: Selects bed (or opens details)
 * - Right-click: Opens context menu for stage updates
 * - Quick Actions: Inline dropdown for disposition bottlenecks
 */

/**
 * Props for the BedCard component
 * @property {BedWithElapsedTime} bed - The bed data model
 * @property {Function} [onClick] - Primary click handler
 * @property {Function} [onContextMenu] - Context menu handler
 * @property {Function} [onReasonSelect] - Handler for bottleneck reason selection
 * @property {boolean} [showUpdated] - Visual flag for recently updated beds
 * @property {string | null} [errorMessage] - Error message to display inline
 */
interface BedCardProps {
  bed: BedWithElapsedTime
  onClick?: (bed: BedWithElapsedTime) => void
  onContextMenu?: (event: MouseEvent<HTMLDivElement>, bed: BedWithElapsedTime) => void
  onReasonSelect?: (bedId: string, reason: DispositionDelayReason) => void
  onViewHistory?: () => void
  showUpdated?: boolean
  errorMessage?: string | null
}

export const BedCard = memo(function BedCard({
  bed,
  onClick,
  onContextMenu,
  onReasonSelect,
  onViewHistory,
  showUpdated = false,
  errorMessage = null,
}: BedCardProps) {
  // ... existing code ...
  // ... existing code ...
  // ... existing code ...
  // ... existing code ...
  // ... existing code ...
  // ... existing code ...
  // ... existing code ...
  const stageName = bed.currentStage?.name || 'Empty'
  const stageColor = bed.currentStage?.colorCode || 'gray'
  const colorClasses = getStageColorClasses(stageColor)
  const elapsedTime = useElapsedTime(bed.patientStartTime)
  const isOccupied = bed.isOccupied
  const isDelayed = bed.isDelayed
  const isBottleneck = bed.isDispositionBottleneck

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all cursor-pointer sm:hover:scale-105 sm:hover:shadow-lg active:scale-[0.97]',
        colorClasses.bg,
        colorClasses.border,
        'border-2',
        isDelayed && 'ring-2 ring-red-500 animate-pulse',
        isBottleneck && 'ring-2 ring-amber-500 animate-pulse'
      )}
      onClick={() => onViewHistory ? onViewHistory() : onClick?.(bed)}
      onContextMenu={(event) => onContextMenu?.(event, bed)}
    >
      <BedStatusIndicators isDelayed={isDelayed} isBottleneck={isBottleneck} />

      <CardContent className="p-4 space-y-3">
        <BedHeader
          bedNumber={bed.bedNumber}
          isOccupied={isOccupied}
          isDelayed={isDelayed}
          colorClasses={colorClasses}
        />

        {/* Stage Name & Details */}
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Current Stage</p>
          <p className={cn('text-sm font-semibold', colorClasses.text)}>
            {stageName}
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
