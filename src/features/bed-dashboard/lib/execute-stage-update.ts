// Stage update execution with optimistic UI and validation feedback
// Epic 2: One-Click Stage Update System

import type { Dispatch, SetStateAction } from 'react'
import type { BedGridData, BedWithElapsedTime, Stage } from '../types/bed'
import { updateBedStage } from '../actions/bed-actions'

const UPDATE_TIMEOUT_MS = 2000

function isNonPatientStage(stageName: string): boolean {
  const normalized = stageName.trim().toLowerCase()
  return normalized === 'empty' || normalized === 'cleaning'
}

export interface ExecuteStageUpdateArgs {
  bedId: string
  stageId: string
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
  routerRefresh: () => void
  updateTimeoutTimer: React.MutableRefObject<NodeJS.Timeout | null>
  isUpdateTimedOut: React.MutableRefObject<boolean>
  options?: { supervisorOverride: boolean; overrideReason?: string }
}

export async function executeStageUpdate({
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
  routerRefresh,
  updateTimeoutTimer,
  isUpdateTimedOut,
  options,
}: ExecuteStageUpdateArgs): Promise<boolean> {
  if (updatingBedId) {
    setTemporaryError(bedId, 'Update in progress, please wait.')
    return false
  }

  const stage = stageById.get(stageId)
  const previousBed = data.beds.find((bed) => bed.id === bedId)

  if (!stage || !previousBed) {
    setTemporaryError(bedId, 'Unable to find bed or stage.')
    return false
  }

  setUpdatingBedId(bedId)
  setUpdatingStageId(stageId)
  clearError(bedId)

  const now = new Date()
  const shouldBeUnoccupied = isNonPatientStage(stage.name)
  const nextIsOccupied = !shouldBeUnoccupied
  const nextPatientStartTime = shouldBeUnoccupied
    ? null
    : previousBed.patientStartTime ?? now

  setData((prev) => ({
    ...prev,
    beds: prev.beds.map((bed) =>
      bed.id === bedId
        ? {
            ...bed,
            currentStageId: stageId,
            currentStage: stage,
            lastStageChange: now,
            elapsedTimeMs: 0,
            isDelayed: false,
            isOccupied: nextIsOccupied,
            patientStartTime: nextPatientStartTime,
          }
        : bed
    ),
  }))

  try {
    isUpdateTimedOut.current = false

    const updatePromise = updateBedStage({
      bedId,
      toStageId: stageId,
      supervisorOverride: options?.supervisorOverride ?? false,
      overrideReason: options?.overrideReason,
    })

    const timeoutPromise = new Promise<never>((_, reject) => {
      updateTimeoutTimer.current = setTimeout(() => {
        isUpdateTimedOut.current = true
        reject(new Error('Update took too long (>2 seconds)'))
      }, UPDATE_TIMEOUT_MS)
    })

    const result = await Promise.race([updatePromise, timeoutPromise])

    if (isUpdateTimedOut.current) {
      throw new Error('Update took too long (>2 seconds)')
    }

    if (!result.success) {
      if (result.requiresOverride && !options?.supervisorOverride) {
        setTemporaryError(bedId, result.reason || result.error || 'Supervisor approval required')
        openOverrideModal(previousBed, stage, result.reason || result.error || null)

        setData((prev) => ({
          ...prev,
          beds: prev.beds.map((bed) => (bed.id === bedId ? previousBed : bed)),
        }))
        return false
      }

      throw new Error(result.reason || result.error || 'Failed to update stage')
    }

    if (!result.data) {
      throw new Error('Failed to update stage')
    }

    const responseData = result.data
    const serverPatientStartTime = responseData.patientStartTime
      ? new Date(responseData.patientStartTime)
      : null
    const serverLastStageChange = responseData.lastStageChange
      ? new Date(responseData.lastStageChange)
      : now

    setData((prev) => ({
      ...prev,
      beds: prev.beds.map((bed) =>
        bed.id === bedId
          ? {
              ...bed,
              currentStageId: stageId,
              currentStage: stage,
              lastStageChange: serverLastStageChange,
              isOccupied: responseData.isOccupied,
              patientStartTime: serverPatientStartTime,
              elapsedTimeMs: responseData.isOccupied ? 0 : null,
              isDelayed: false,
            }
          : bed
      ),
    }))

    showSuccessFeedback(bedId, stageId)
    routerRefresh()
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update stage'
    setTemporaryError(bedId, message)

    setData((prev) => ({
      ...prev,
      beds: prev.beds.map((bed) => (bed.id === bedId ? previousBed : bed)),
    }))
    routerRefresh()
    return false
  } finally {
    if (updateTimeoutTimer.current !== null) {
      clearTimeout(updateTimeoutTimer.current)
      updateTimeoutTimer.current = null
    }
    setUpdatingBedId(null)
    setUpdatingStageId(null)
  }
}
