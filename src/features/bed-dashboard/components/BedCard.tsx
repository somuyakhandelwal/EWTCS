// Bed Card Component
// Epic 1: Nurse Desk Bed Dashboard

import { memo } from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import type { BedWithElapsedTime } from '../types/bed'
import { formatElapsedTime, getStageColorClasses } from '../lib/utils'
import { cn } from '@/shared/lib/utils'
import { BedStageButtons } from './BedStageButtons'
import type { Stage } from '../types/bed'

interface BedCardProps {
  bed: BedWithElapsedTime
  stages: Stage[]
  onClick?: (bed: BedWithElapsedTime) => void
  onStageSelect: (bedId: string, stageId: string) => void
  isUpdating: boolean
  updatingStageId: string | null
  lastUpdatedStageId: string | null
  errorMessage?: string | null
}

export const BedCard = memo(function BedCard({
  bed,
  stages,
  onClick,
  onStageSelect,
  isUpdating,
  updatingStageId,
  lastUpdatedStageId,
  errorMessage,
}: BedCardProps) {
  const stageName = bed.currentStage?.name || 'Empty'
  const stageColor = bed.currentStage?.colorCode || 'gray'
  const colorClasses = getStageColorClasses(stageColor)
  const elapsedTime = formatElapsedTime(bed.elapsedTimeMs)
  const isOccupied = bed.isOccupied
  const isDelayed = bed.isDelayed

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all cursor-pointer hover:scale-105 hover:shadow-lg',
        colorClasses.bg,
        colorClasses.border,
        'border-2',
        isDelayed && 'ring-2 ring-red-500 animate-pulse'
      )}
      onClick={() => onClick?.(bed)}
    >
      {/* Delay indicator */}
      {isDelayed && (
        <div className="absolute top-2 right-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
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
          {lastUpdatedStageId && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              Updated
            </div>
          )}
        </div>

        {/* Elapsed Time */}
        {isOccupied && bed.patientStartTime && (
          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-700/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-500" />
              <div className="flex-1">
                <p className="text-[10px] text-zinc-500 uppercase">Total Stay</p>
                <p className={cn(
                  'text-base font-bold',
                  isDelayed ? 'text-red-400' : 'text-zinc-300'
                )}>
                  {elapsedTime}
                </p>
              </div>
            </div>

            {bed.lastStageChange && (
              <div className="flex items-center gap-2 pl-6">
                <div className="flex-1">
                  <p className="text-[10px] text-zinc-500 uppercase">In current stage</p>
                  <p className="text-sm font-semibold text-zinc-400">
                    {formatElapsedTime(Date.now() - new Date(bed.lastStageChange).getTime())}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty bed status */}
        {!isOccupied && (
          <div className="pt-2 border-t border-zinc-700/50">
            <p className="text-xs text-zinc-500">Status</p>
            <p className="text-sm font-medium text-zinc-400">Available</p>
          </div>
        )}

        <BedStageButtons
          bed={bed}
          stages={stages}
          onStageSelect={onStageSelect}
          isUpdating={isUpdating}
          updatingStageId={updatingStageId}
        />

        {errorMessage && (
          <p className="text-xs text-red-400">{errorMessage}</p>
        )}
      </CardContent>
    </Card>
  )
})
