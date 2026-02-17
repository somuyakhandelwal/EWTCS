// Bed Stage Update Hook
// Handles optimistic updates, validation feedback, and supervisor overrides

'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BedGridData, BedWithElapsedTime, Stage } from '../types/bed'
import { useErrorTimers, useSuccessFeedback } from './useBedUpdateState'
import { useStageUpdateActions } from './useStageUpdateActions'

const SUCCESS_FEEDBACK_MS = 3000

export interface OverrideState {
  bedId: string
  stageId: string
  bedNumber: string
  fromStageName: string | null
  toStage: Stage
  reason: string | null
}

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
}

export function useBedStageUpdate(initialData: BedGridData): UseBedStageUpdateReturn {
  const router = useRouter()
  const [data, setData] = useState<BedGridData>(initialData)
  const [updatingBedId, setUpdatingBedId] = useState<string | null>(null)
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null)
  const [overrideState, setOverrideState] = useState<OverrideState | null>(null)

  const { errorByBedId, setTemporaryError, clearError } = useErrorTimers()
  const { lastUpdatedBedId, lastUpdatedStageId, showSuccessFeedback } =
    useSuccessFeedback(SUCCESS_FEEDBACK_MS)

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

  const { isOverrideSubmitting, handleStageSelect, handleOverrideApprove } = useStageUpdateActions({
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
  }
}
