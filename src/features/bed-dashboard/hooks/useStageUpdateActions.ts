// Stage update actions and supervisor override handling
// Epic 2: One-Click Stage Update System

'use client'

import { useCallback, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useRouter } from 'next/navigation'

import type { BedGridData, BedWithElapsedTime, Stage, OverrideState, ConfirmationState } from '../types/bed'
import { executeStageUpdate } from '../lib/execute-stage-update'
import { isCriticalStage } from '../lib/utils'

/** Stage name that triggers the dedicated discharge modal (US-2.3) */
const DISCHARGE_STAGE_NAME = 'Discharge Process'
const TRIAGE_STAGE_NAME = 'Triage'

interface StageUpdateActionsDeps {
  data: BedGridData
  stageById: Map<string, Stage>
  updatingBedId: string | null
  setUpdatingBedId: (bedId: string | null) => void
  setUpdatingStageId: (stageId: string | null) => void
  setData: Dispatch<SetStateAction<BedGridData>>
  setTemporaryError: (bedId: string, message: string) => void
  clearError: (bedId: string) => void
  showSuccessFeedback: (bedId: string, stageId: string) => void
  openOverrideModal: (bed: BedWithElapsedTime, stage: Stage, reason: string | null) => void
  overrideState: OverrideState | null
  closeOverrideModal: () => void
  openConfirmationModal: (bed: BedWithElapsedTime, stage: Stage) => void
  confirmationState: ConfirmationState | null
  closeConfirmationModal: () => void
  confirmCriticalStages: boolean
  // US-2.3: Discharge intercept
  openDischargeModal: (bed: BedWithElapsedTime) => void
  // US-20.2: Triage intercept
  openTriageModal: (bed: BedWithElapsedTime, stage: Stage) => void
}

interface StageUpdateActionsResult {
  isOverrideSubmitting: boolean
  handleStageSelect: (bedId: string, stageId: string) => Promise<void>
  handleOverrideApprove: (reason: string) => Promise<void>
  handleConfirmationConfirm: () => Promise<void>
  performStageUpdate: (bedId: string, stageId: string, options?: { supervisorOverride?: boolean; overrideReason?: string }) => Promise<boolean>
}

export function useStageUpdateActions(deps: StageUpdateActionsDeps): StageUpdateActionsResult {
  const {
    data,
    stageById,
    updatingBedId,
    setUpdatingBedId,
    setUpdatingStageId,
    setData,
    setTemporaryError,
    clearError,
    showSuccessFeedback,
    openOverrideModal,
    overrideState,
    closeOverrideModal,
    openConfirmationModal,
    confirmationState,
    closeConfirmationModal,
    confirmCriticalStages,
    openDischargeModal,
    openTriageModal
  } = deps

  const router = useRouter()
  const [isOverrideSubmitting, setIsOverrideSubmitting] = useState(false)
  const updateTimeoutTimer = useRef<NodeJS.Timeout | null>(null)
  const isUpdateTimedOut = useRef<boolean>(false)

  const performStageUpdate = useCallback(
    async (
      bedId: string,
      stageId: string,
      options?: { supervisorOverride: boolean; overrideReason?: string }
    ): Promise<boolean> => {
      return executeStageUpdate({
        bedId,
        stageId,
        data,
        stageById,
        updatingBedId,
        setUpdatingBedId,
        setUpdatingStageId,
        setData,
        setTemporaryError,
        clearError,
        showSuccessFeedback,
        openOverrideModal,
        routerRefresh: () => router.refresh(),
        updateTimeoutTimer,
        isUpdateTimedOut,
        options,
      })
    },
    [
      data,
      stageById,
      updatingBedId,
      setUpdatingBedId,
      setUpdatingStageId,
      setData,
      setTemporaryError,
      clearError,
      showSuccessFeedback,
      openOverrideModal,
      router,
    ]
  )

  const handleStageSelect = useCallback(
    async (bedId: string, stageId: string) => {
      const stage = stageById.get(stageId)
      const bed = data.beds.find(b => b.id === bedId)

      if (!stage || !bed) return

      // US-20.2: Intercept "Triage" stage update to collect patient details
      if (stage.name === TRIAGE_STAGE_NAME) {
        openTriageModal(bed, stage)
        return
      }

      // US-2.3: Intercept "Discharge Process" on an occupied bed → show discharge modal
      // This takes priority over the generic critical-stage confirmation.
      if (
        stage.name === DISCHARGE_STAGE_NAME &&
        (bed.isOccupied || bed.patientStartTime !== null)
      ) {
        openDischargeModal(bed)
        return
      }

      // Only show confirmation if the setting is enabled AND it's a critical stage
      if (stage && bed && isCriticalStage(stage.name) && confirmCriticalStages) {
        openConfirmationModal(bed, stage)
        return
      }

      await performStageUpdate(bedId, stageId)
    },
    [performStageUpdate, stageById, data.beds, openTriageModal, openDischargeModal, openConfirmationModal, confirmCriticalStages]
  )

  const handleConfirmationConfirm = useCallback(async () => {
    if (!confirmationState) return

    // Proceed with the update
    // Note: performStageUpdate handles validation and override checks internally
    await performStageUpdate(confirmationState.bedId, confirmationState.stageId)

    closeConfirmationModal()
  }, [confirmationState, performStageUpdate, closeConfirmationModal])

  const handleOverrideApprove = useCallback(
    async (reason: string) => {
      if (!overrideState) {
        return
      }

      setIsOverrideSubmitting(true)
      const success = await performStageUpdate(overrideState.bedId, overrideState.stageId, {
        supervisorOverride: true,
        overrideReason: reason,
      })
      setIsOverrideSubmitting(false)
      if (success) {
        closeOverrideModal()
      }
    },
    [overrideState, performStageUpdate, closeOverrideModal]
  )

  return { isOverrideSubmitting, handleStageSelect, handleOverrideApprove, handleConfirmationConfirm, performStageUpdate }
}
