// Stage update actions and supervisor override handling
// Epic 2: One-Click Stage Update System

'use client'

import { useCallback, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import type { BedGridData, BedWithElapsedTime, Stage } from '../types/bed'
import type { OverrideState } from './useBedStageUpdate'
import { executeStageUpdate } from '../lib/execute-stage-update'

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
}

interface StageUpdateActionsResult {
  isOverrideSubmitting: boolean
  handleStageSelect: (bedId: string, stageId: string) => Promise<void>
  handleOverrideApprove: (reason: string) => Promise<void>
}

export function useStageUpdateActions({
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
}: StageUpdateActionsDeps): StageUpdateActionsResult {
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
      await performStageUpdate(bedId, stageId)
    },
    [performStageUpdate]
  )

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

  return { isOverrideSubmitting, handleStageSelect, handleOverrideApprove }
}
