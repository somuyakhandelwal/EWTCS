"use client"

import { useMemo } from "react"
import type { BedWithElapsedTime, Stage } from "../types/bed"
import { getStageColorClasses } from "../lib/utils"
import { ContextMenu, type ContextMenuItem } from "@/shared/components/ui/context-menu"

interface BedStageContextMenuProps {
  bed: BedWithElapsedTime | null
  stages: Stage[]
  isOpen: boolean
  position: { x: number; y: number } | null
  isUpdating: boolean
  updatingStageId: string | null
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

      return {
        id: stage.id,
        label: stage.name,
        disabled: isUpdating || isCurrentStage || updatingStageId === stage.id,
        onSelect: () => onStageSelect(bed.id, stage.id),
        className: colorClasses.text,
      }
    })
  }, [bed, stages, isUpdating, updatingStageId, onStageSelect])

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
