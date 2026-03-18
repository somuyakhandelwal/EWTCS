"use client"

import { useMemo } from "react"
import type { BedWithElapsedTime, Stage } from "../types/bed"
import { getStageColorClasses } from '@/shared/utils/stage-colors'
import { ContextMenu, type ContextMenuItem } from "@/shared/components/ui/context-menu"
import { StageIcon } from "./StageIcon"
import { cn } from "@/shared/lib/utils"

interface BedStageContextMenuProps {
  bed: BedWithElapsedTime | null
  stages: Stage[]
  isOpen: boolean
  position: { x: number; y: number } | null
  isUpdating: boolean
  updatingStageId: string | null
  validNextStages?: string[] // Stages without override requirement
  overrideRequiredStages?: string[] // Stages requiring supervisor approval
  error?: string | null // Error message when loading stages fails
  onStageSelect: (bedId: string, stageId: string) => void
  onClose: () => void
  onOpenTriage?: (bedId: string) => void // US-20.2
}

export function BedStageContextMenu({
  bed,
  stages,
  isOpen,
  position,
  isUpdating,
  updatingStageId,
  validNextStages = [],
  overrideRequiredStages = [],
  error,
  onStageSelect,
  onClose,
  onOpenTriage,
}: BedStageContextMenuProps) {
  const getActionLabel = (fromStageName: string, toStageName: string) => {
    if (fromStageName === 'Discharge Process' && toStageName === 'Cleaning') {
      return 'Start Cleaning'
    }

    if (fromStageName === 'Cleaning' && toStageName === 'Empty') {
      return 'Cleaning Complete'
    }

    return toStageName
  }

  const items = useMemo<ContextMenuItem[]>(() => {
    if (!bed) {
      return []
    }

    return stages.map((stage) => {
      const isCurrentStage = bed.currentStageId === stage.id
      const colorClasses = getStageColorClasses(stage.colorCode)
      const isValid = validNextStages.includes(stage.id)
      const requiresOverride = overrideRequiredStages.includes(stage.id)
      const isDisabled = !isValid && !requiresOverride

      const baseLabel = getActionLabel(bed.currentStage?.name ?? 'Empty', stage.name)
      let label = baseLabel
      if (requiresOverride) {
        label = `⚠️ ${baseLabel} (needs approval)`
      }

      return {
        id: stage.id,
        label,
        icon: <StageIcon colorCode={stage.colorCode} className={cn("h-4 w-4", colorClasses.text)} />,
        disabled: isUpdating || isCurrentStage || updatingStageId === stage.id || isDisabled,
        onSelect: () => onStageSelect(bed.id, stage.id),
        className: colorClasses.text,
        title: isDisabled ? 'This transition is not allowed' : requiresOverride ? 'Requires supervisor approval' : undefined,
      }
    })
  }, [bed, stages, isUpdating, updatingStageId, validNextStages, overrideRequiredStages, onStageSelect])

  // US-20.2: Inject the "Update Triage Details" option at the top if the bed is in Triage (or occupied)
  const fullItems = useMemo(() => {
    const result = [...items]
    if (bed?.currentStage?.name === 'Triage' && onOpenTriage) {
      result.unshift({
        id: 'update-triage',
        label: 'Update Triage Details',
        onSelect: () => onOpenTriage(bed.id),
        className: 'text-blue-600 dark:text-blue-400 font-semibold mb-2 border-b pb-2 rounded-none' // stand out
      })
    }
    return result
  }, [items, bed?.currentStage?.name, bed?.id, onOpenTriage])

  if (!bed) {
    return null
  }

  // US-2.2 FLASHY BUG FIX: If we are still loading transition rules, show a loading state
  // instead of a briefly-full (but disabled) menu. This prevents the "flash" of items.
  if (isUpdating && !error) {
    return (
      <ContextMenu
        isOpen={isOpen}
        position={position}
        items={[]}
        onClose={onClose}
        header={bed ? `Verifying access for ${bed.bedNumber}...` : "Checking access..."}
      />
    )
  }

  return (
    <ContextMenu
      isOpen={isOpen}
      position={position}
      items={error ? [] : fullItems}
      onClose={onClose}
      header={bed ? `Update ${bed.bedNumber}` : "Update Bed"}
      error={error}
    />
  )
}
