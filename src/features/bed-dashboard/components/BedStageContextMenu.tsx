"use client"

import { useMemo } from "react"
import type { BedWithElapsedTime, Stage } from "../types/bed"
import { getStageColorClasses } from '@/shared/utils/stage-colors'
import { ContextMenu, type ContextMenuItem } from "@/shared/components/ui/context-menu"

/**
 * BedStageContextMenu Component
 * 
 * Renders a context menu for bed items, allowing users to:
 * 1. Change the bed stage (with validation and override checks)
 * 2. View historical logs for the bed
 * 
 * This component intelligently disables invalid transitions based on the 
 * configured workflow rules and requires supervisor approval for strictly 
 * controlled transitions.
 */

/**
 * Props for the BedStageContextMenu component
 * 
 * @property {BedWithElapsedTime | null} bed - The bed object for which the menu is open
 * @property {Stage[]} stages - List of all available stages in the system
 * @property {boolean} isOpen - Controls the visibility of the menu
 * @property {{ x: number; y: number } | null} position - Screen coordinates for the menu
 * @property {boolean} isUpdating - Loading state indicating a transition is in progress
 * @property {string | null} updatingStageId - The ID of the stage being transitioned to (for specific loading state)
 * @property {string[]} [validNextStages] - Set of stage IDs that are valid next steps from the current stage
 * @property {string[]} [overrideRequiredStages] - Set of stage IDs that require supervisor override
 * @property {(bedId: string, stageId: string) => void} onStageSelect - Handler for stage selection
 * @property {() => void} onClose - Handler to close the menu
 * @property {(bedId: string, bedNumber: string) => void} [onViewHistory] - Handler to open history view
 */
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
  onViewHistory?: (bedId: string, bedNumber: string) => void
}

/**
 * Helper function to generate a menu item for a specific stage.
 * encapsulated logic for styling, disabling, and labeling based on rules.
 * 
 * @param {Stage} stage - The target stage
 * @param {BedWithElapsedTime} bed - The current bed
 * @param {boolean} isUpdating - Global updating state
 * @param {string | null} updatingStageId - Specific stage updating state
 * @param {string[]} validNextStages - List of valid transitions
 * @param {string[]} overrideRequiredStages - List of restricted transitions
 * @param {Function} onSelect - Selection handler
 * @returns {ContextMenuItem} The formatted menu item
 */
function createStageMenuItem(
  stage: Stage,
  bed: BedWithElapsedTime,
  isUpdating: boolean,
  updatingStageId: string | null,
  validNextStages: string[],
  overrideRequiredStages: string[],
  onSelect: (bedId: string, stageId: string) => void
): ContextMenuItem {
  const isCurrentStage = bed.currentStageId === stage.id
  const colorClasses = getStageColorClasses(stage.colorCode)
  const isValid = validNextStages.includes(stage.id)
  const requiresOverride = overrideRequiredStages.includes(stage.id)

  // A stage is disabled if:
  // 1. A global update is in progress
  // 2. It is the current stage
  // 3. Another specific stage is being updated to
  // 4. It is not a valid next stage AND not an override-required stage
  const isDisabled = !isValid && !requiresOverride && !isCurrentStage

  // Add warning label for restricted transitions
  let label = stage.name
  if (requiresOverride) {
    label = `⚠️ ${stage.name} (needs approval)`
  }

  // Determine title for tooltip behavior
  let title: string | undefined
  if (isDisabled) {
    title = 'This transition is not allowed from the current stage'
  } else if (requiresOverride) {
    title = 'Requires supervisor approval to proceed'
  } else if (isCurrentStage) {
    title = 'Current stage'
  }

  return {
    id: stage.id,
    label,
    disabled: isUpdating || isCurrentStage || updatingStageId === stage.id || isDisabled,
    onSelect: () => onSelect(bed.id, stage.id),
    className: colorClasses.text,
    // title is not supported by ContextMenuItem type currently
  }
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
  onViewHistory,
}: BedStageContextMenuProps) {
  const items = useMemo<ContextMenuItem[]>(() => {
    if (!bed) {
      return []
    }

    const stageItems = stages.map((stage) =>
      createStageMenuItem(
        stage,
        bed,
        isUpdating,
        updatingStageId,
        validNextStages,
        overrideRequiredStages,
        onStageSelect
      )
    )

    if (onViewHistory) {
      stageItems.push({
        id: 'view_history',
        label: 'View History & Logs',
        disabled: false,
        onSelect: () => onViewHistory(bed.id, bed.bedNumber),
        className: 'text-zinc-400 border-t border-zinc-800 mt-2 pt-2'
      } as ContextMenuItem)
    }

    return stageItems
  }, [bed, stages, isUpdating, updatingStageId, validNextStages, overrideRequiredStages, onStageSelect, onViewHistory])


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

// --- Future Considerations ---
// The following interfaces are placeholders for potential future enhancements
// to the context menu system, such as nested submenus for specific actions
// within a stage (e.g., "Clean - Deep Clean" vs "Clean - Quick Turnaround").

/*
interface SubMenuAction {
  id: string
  label: string
  parentStageId: string
  action: () => void
}

interface AdvancedContextMenuProps extends BedStageContextMenuProps {
  subActions?: SubMenuAction[]
  showIcons?: boolean
  theme?: 'light' | 'dark'
}
*/

/**
 * Technical Note:
 * This component uses generic coordinates for positioning. 
 * Ensure that the parent container has a tailored `z-index` context 
 * if the menu appears underneath other modal layers.
 * 
 * Performance Note:
 * The `items` array is memoized to prevent flickering during rapid 
 * mouse movements or when other bed states update in the background.
 */
