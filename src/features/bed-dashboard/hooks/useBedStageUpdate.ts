// Bed Stage Update Hook
// Handles optimistic updates, validation feedback, and supervisor overrides

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BedGridData, BedWithElapsedTime, Stage, OverrideState, ConfirmationState, DischargeState } from '../types/bed'
import { useErrorTimers, useSuccessFeedback } from './useBedUpdateState'
import { useStageUpdateActions } from './useStageUpdateActions'
import { useDashboardSettings } from './useDashboardSettings'
import { useDischargeConfirm } from './useDischargeConfirm'

const SUCCESS_FEEDBACK_MS = 3000



interface UseBedStageUpdateReturn {
  data: BedGridData
  updatingBedId: string | null
  updatingStageId: string | null
  lastUpdatedBedId: string | null
  lastUpdatedStageId: string | null
  errorByBedId: Record<string, string>
  isOverrideSubmitting: boolean
  overrideState: OverrideState | null
  handleRefresh: () => Promise<void>
  handleStageSelect: (bedId: string, stageId: string) => Promise<void>
  handleOverrideApprove: (reason: string) => Promise<void>
  closeOverrideModal: () => void
  confirmationState: ConfirmationState | null
  handleConfirmationConfirm: () => Promise<void>
  closeConfirmationModal: () => void
  settings: { confirmCriticalStages: boolean }
  toggleConfirmation: () => void
  // US-2.3: Discharge workflow
  dischargeState: DischargeState | null
  isDischargeSubmitting: boolean
  handleDischargeConfirm: () => Promise<void>
  closeDischargeModal: () => void
}

export function useBedStageUpdate(initialData: BedGridData): UseBedStageUpdateReturn {
  const router = useRouter()
  const [data, setData] = useState<BedGridData>(initialData)
  const [updatingBedId, setUpdatingBedId] = useState<string | null>(null)
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null)
  const [overrideState, setOverrideState] = useState<OverrideState | null>(null)
  const [confirmationState, setConfirmationState] = useState<ConfirmationState | null>(null)
  // US-2.3
  const [dischargeState, setDischargeState] = useState<DischargeState | null>(null)

  const { errorByBedId, setTemporaryError, clearError } = useErrorTimers()
  const { lastUpdatedBedId, lastUpdatedStageId, showSuccessFeedback } =
    useSuccessFeedback(SUCCESS_FEEDBACK_MS)
  const { settings, toggleConfirmation } = useDashboardSettings()

  // Sync displayed data when realtimeData changes (polling or manual realtimeRefresh after undo).
  // Guard: skip while an update is in-flight to preserve optimistic state.
  // This fix ensures stage colours and transition options reflect the true server state.
  useEffect(() => {
    if (!updatingBedId) {
      setData(initialData)
    }
  }, [initialData, updatingBedId])

  const stageById = useMemo(() => {
    const map = new Map<string, Stage>()
    initialData.stages.forEach(stage => map.set(stage.id, stage))
    return map
  }, [initialData.stages])

  const handleRefresh = useCallback(async () => router.refresh(), [router])

  const openOverrideModal = useCallback(
    (bed: BedWithElapsedTime, stage: Stage, reason: string | null) => {
      setOverrideState({
        bedId: bed.id,
        stageId: stage.id,
        bedNumber: bed.bedNumber,
        fromStageName: bed.currentStage?.name ?? 'Empty',
        toStage: stage,
        reason,
      })
    },
    []
  )

  const closeOverrideModal = useCallback(() => {
    setOverrideState(null)
  }, [])

  const openConfirmationModal = useCallback(
    (bed: BedWithElapsedTime, stage: Stage) => {
      setConfirmationState({
        bedId: bed.id,
        stageId: stage.id,
        bedNumber: bed.bedNumber,
        fromStageName: bed.currentStage?.name ?? 'Empty',
        toStage: stage,
      })
    },
    []
  )

  const closeConfirmationModal = useCallback(() => {
    setConfirmationState(null)
  }, [])

  // US-2.3: Discharge modal open/close
  const openDischargeModal = useCallback((bed: BedWithElapsedTime) => {
    setDischargeState({
      bedId: bed.id,
      bedNumber: bed.bedNumber,
      fromStageName: bed.currentStage?.name ?? null,
      elapsedTimeMs: bed.elapsedTimeMs,
      patientStartTime: bed.patientStartTime,
    })
  }, [])

  const closeDischargeModal = useCallback(() => {
    setDischargeState(null)
  }, [])

  const { isDischargeSubmitting, handleDischargeConfirm } = useDischargeConfirm({
    dischargeState,
    data,
    setData,
    closeDischargeModal,
    setTemporaryError,
    showSuccessFeedback,
    handleRefresh,
  })

  const { isOverrideSubmitting, handleStageSelect, handleOverrideApprove, handleConfirmationConfirm } = useStageUpdateActions({
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
    confirmCriticalStages: settings.confirmCriticalStages,
    // US-2.3
    openDischargeModal,
  })

  return {
    data,
    updatingBedId,
    updatingStageId,
    lastUpdatedBedId,
    lastUpdatedStageId,
    errorByBedId,
    isOverrideSubmitting,
    overrideState,
    handleRefresh,
    handleStageSelect,
    handleOverrideApprove,
    closeOverrideModal,
    confirmationState,
    handleConfirmationConfirm,
    closeConfirmationModal,
    settings,
    toggleConfirmation,
    // US-2.3
    dischargeState,
    isDischargeSubmitting,
    handleDischargeConfirm,
    closeDischargeModal,
  }
}
