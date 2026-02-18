"use client"

import { useMemo } from "react"
import type { BedWithElapsedTime, Stage } from "../types/bed"
import { getStageColorClasses } from '@/shared/utils/stage-colors'
import { ContextMenu, type ContextMenuItem } from "@/shared/components/ui/context-menu"

interface BedStageContextMenuProps {
  bed: BedWithElapsedTime | null
  stages: Stage[]
  isOpen: boolean
  position: { x: number; y: number } | null
  isUpdating: boolean
  updatingStageId: string | null
  validNextStages?: string[] // Stages without override requirement
  overrideRequiredStages?: string[] // Stages requiring supervisor approval
  onStageSelect: (bedId: string, stageId: string) => void
  onClose: () => void
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
  onStageSelect,
  onClose,
}: BedStageContextMenuProps) {
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

      let label = stage.name
      if (requiresOverride) {
        label = `⚠️ ${stage.name} (needs approval)`
      }

      return {
        id: stage.id,
        label,
        disabled: isUpdating || isCurrentStage || updatingStageId === stage.id || isDisabled,
        onSelect: () => onStageSelect(bed.id, stage.id),
        className: colorClasses.text,
        title: isDisabled ? 'This transition is not allowed' : requiresOverride ? 'Requires supervisor approval' : undefined,
      }
    })
  }, [bed, stages, isUpdating, updatingStageId, validNextStages, overrideRequiredStages, onStageSelect])

  if (!bed) {
    return null
  }

  return (
    <ContextMenu
      isOpen={isOpen}
      position={position}
      items={items}
      onClose={onClose}
      header={`Update ${bed.bedNumber}`}
    />
  )
}
