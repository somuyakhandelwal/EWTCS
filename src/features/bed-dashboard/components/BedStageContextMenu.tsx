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
  isLoadingTransitions: boolean
  isMutating: boolean
  updatingStageId: string | null
  isOffline?: boolean
  validNextStages?: string[] // Stages without override requirement
  overrideRequiredStages?: string[] // Stages requiring supervisor approval
  error?: string | null // Error message when loading stages fails
  onStageSelect: (bedId: string, stageId: string) => void
  onClose: () => void
}

export function BedStageContextMenu({
  bed,
  stages,
  isOpen,
  position,
  isLoadingTransitions,
  isMutating,
  updatingStageId,
  isOffline = false,
  validNextStages = [],
  overrideRequiredStages = [],
  error,
  onStageSelect,
  onClose,
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
      const hasRuleData = validNextStages.length > 0 || overrideRequiredStages.length > 0
      const isFallbackAllowed = isOffline && !hasRuleData && !isCurrentStage
      const isDisabled = isFallbackAllowed ? false : !isValid && !requiresOverride

      const baseLabel = getActionLabel(bed.currentStage?.name ?? 'Empty', stage.name)
      let label = baseLabel
      if (requiresOverride) {
        label = `⚠️ ${baseLabel} (needs approval)`
      }

      return {
        id: stage.id,
        label,
        icon: <StageIcon colorCode={stage.colorCode} className={cn("h-4 w-4", colorClasses.text)} />,
        disabled: isMutating || isLoadingTransitions || isCurrentStage || updatingStageId === stage.id || isDisabled,
        onSelect: () => onStageSelect(bed.id, stage.id),
        className: colorClasses.text,
        title: isDisabled
          ? 'This transition is not allowed'
          : requiresOverride
            ? 'Requires supervisor approval'
            : isFallbackAllowed
              ? 'Offline fallback: transition validation will run when sync resumes'
              : undefined,
      }
    })
  }, [bed, stages, isMutating, isLoadingTransitions, updatingStageId, isOffline, validNextStages, overrideRequiredStages, onStageSelect])

  if (!bed) {
    return null
  }

  // US-2.2 FLASHY BUG FIX: If we are still loading transition rules, show a loading state
  // instead of a briefly-full (but disabled) menu. This prevents the "flash" of items.
  if (isLoadingTransitions && !error) {
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
      items={error ? [] : items}
      onClose={onClose}
      header={bed ? `Update ${bed.bedNumber}` : "Update Bed"}
      error={error}
    />
  )
}
