// Bed Stage Buttons
// Epic 2: One-Click Stage Update System

'use client'

import { memo } from 'react'
import { cn } from '@/shared/lib/utils'
import { Loader2, ChevronDown } from 'lucide-react'
import type { BedWithElapsedTime, Stage } from '../types/bed'
import { getStageColorClasses } from '../lib/utils'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '@/shared/components/ui/context-menu'

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
  const currentStage = stages.find(s => s.id === bed.currentStageId)
  const currentColorClasses = currentStage ? getStageColorClasses(currentStage.colorCode) : null

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">Update Stage</p>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-md border cursor-context-menu transition-colors',
              'hover:bg-zinc-800/50',
              currentColorClasses?.border,
              currentColorClasses?.text,
              'text-sm font-medium'
            )}
          >
            <span className="flex items-center gap-2">
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
              {currentStage?.name || 'Select Stage'}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56 bg-zinc-900 border-zinc-700">
          <ContextMenuLabel className="text-zinc-400">Change Stage</ContextMenuLabel>
          <ContextMenuSeparator className="bg-zinc-700" />
          {stages.map((stage) => {
            const isCurrentStage = bed.currentStageId === stage.id
            const isStageUpdating = isUpdating && updatingStageId === stage.id
            const colorClasses = getStageColorClasses(stage.colorCode)

            return (
              <ContextMenuItem
                key={stage.id}
                disabled={isUpdating || isCurrentStage}
                onClick={(e) => {
                  e.stopPropagation()
                  onStageSelect(bed.id, stage.id)
                }}
                className={cn(
                  'cursor-pointer',
                  colorClasses.text,
                  isCurrentStage && 'bg-zinc-800 font-semibold',
                  'hover:bg-zinc-800 focus:bg-zinc-800'
                )}
              >
                <span className="flex items-center gap-2 w-full">
                  {isStageUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span className="flex-1">{stage.name}</span>
                  {isCurrentStage && (
                    <span className="text-xs text-zinc-500">Current</span>
                  )}
                </span>
              </ContextMenuItem>
            )
          })}
        </ContextMenuContent>
      </ContextMenu>
      <p className="text-xs text-zinc-500 italic">Right-click to change stage</p>
    </div>
  )
})
