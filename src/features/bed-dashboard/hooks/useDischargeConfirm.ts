// US-2.3: Discharge confirm handler
// Extracted from useBedStageUpdate to keep files under the 200-line limit.
'use client'

import { useCallback, useState } from 'react'
import type { BedGridData, DischargeState } from '../types/bed'
import { dischargeAndResetBed } from '../actions/discharge-actions'

interface UseDischargeConfirmParams {
  dischargeState: DischargeState | null
  data: BedGridData
  setData: React.Dispatch<React.SetStateAction<BedGridData>>
  closeDischargeModal: () => void
  setTemporaryError: (bedId: string, message: string) => void
  showSuccessFeedback: (bedId: string, stageId: string) => void
  handleRefresh: () => Promise<void>
}

interface UseDischargeConfirmReturn {
  isDischargeSubmitting: boolean
  handleDischargeConfirm: () => Promise<void>
}

/**
 * Encapsulates the optimistic-update + server call + rollback logic
 * for confirming a patient discharge (US-2.3).
 */
export function useDischargeConfirm({
  dischargeState,
  data,
  setData,
  closeDischargeModal,
  setTemporaryError,
  showSuccessFeedback,
  handleRefresh,
}: UseDischargeConfirmParams): UseDischargeConfirmReturn {
  const [isDischargeSubmitting, setIsDischargeSubmitting] = useState(false)

  const handleDischargeConfirm = useCallback(async () => {
    if (!dischargeState) return

    setIsDischargeSubmitting(true)
    const bedId = dischargeState.bedId

    // Optimistic update: immediately show bed as cleaning
    const cleaningStage = data.stages.find((s) => s.name.toLowerCase() === 'cleaning')
    const previousBed = data.beds.find((b) => b.id === bedId)

    if (cleaningStage && previousBed) {
      setData((prev) => ({
        ...prev,
        beds: prev.beds.map((bed) =>
          bed.id === bedId
            ? {
                ...bed,
                currentStageId: cleaningStage.id,
                currentStage: cleaningStage,
                isOccupied: false,
                patientStartTime: null,
                elapsedTimeMs: null,
                isDelayed: false,
                isDispositionBottleneck: false,
                dispositionElapsedMs: null,
                dispositionDelayReason: null,
                dispositionDelayLogId: null,
              }
            : bed
        ),
      }))
    }

    const result = await dischargeAndResetBed({ bedId })

    setIsDischargeSubmitting(false)
    closeDischargeModal()

    if (!result.success) {
      // Rollback optimistic update
      if (previousBed) {
        setData((prev) => ({
          ...prev,
          beds: prev.beds.map((bed) => (bed.id === bedId ? previousBed : bed)),
        }))
      }
      setTemporaryError(bedId, result.error ?? 'Discharge failed. Please try again.')
    } else {
      showSuccessFeedback(bedId, cleaningStage?.id ?? '')
      await handleRefresh()
    }
  }, [
    dischargeState,
    data,
    setData,
    closeDischargeModal,
    setTemporaryError,
    showSuccessFeedback,
    handleRefresh,
  ])

  return { isDischargeSubmitting, handleDischargeConfirm }
}
