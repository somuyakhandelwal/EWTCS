// Bed Stage Buttons
// Epic 2: One-Click Stage Update System

import { memo } from 'react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { Loader2 } from 'lucide-react'
import type { BedWithElapsedTime, Stage } from '../types/bed'
import { getStageColorClasses } from '../lib/utils'

interface BedStageButtonsProps {
  bed: BedWithElapsedTime
  stages: Stage[]
  onStageSelect: (bedId: string, stageId: string) => void
  isUpdating: boolean
  updatingStageId: string | null
}

export const BedStageButtons = memo(function BedStageButtons({
  bed,
  stages,
  onStageSelect,
  isUpdating,
  updatingStageId,
}: BedStageButtonsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">Update Stage</p>
      <div className="grid grid-cols-2 gap-2">
        {stages.map((stage) => {
          const isCurrentStage = bed.currentStageId === stage.id
          const isStageUpdating = isUpdating && updatingStageId === stage.id
          const colorClasses = getStageColorClasses(stage.colorCode)

          return (
            <Button
              key={stage.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={isUpdating || isCurrentStage}
              onClick={() => onStageSelect(bed.id, stage.id)}
              className={cn(
                'justify-start text-xs h-9 px-2 border',
                colorClasses.border,
                colorClasses.text,
                isCurrentStage && colorClasses.bg
              )}
              aria-pressed={isCurrentStage}
              aria-label={`Update ${bed.bedNumber} to ${stage.name}`}
            >
              {isStageUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
              <span className="truncate">{stage.name}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
})
