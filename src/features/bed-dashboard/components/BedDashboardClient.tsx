// Bed Dashboard Client Wrapper
// Epic 1: Nurse Desk Bed Dashboard
// This component wraps the BedGrid to handle client-side interactions

'use client'

import { useCallback, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { BedGrid } from './BedGrid'
import type { BedGridData, BedWithElapsedTime, Stage } from '../types/bed'
import { updateBedStage } from '../actions/bed-actions'
import { useErrorTimers, useSuccessFeedback } from '../hooks/useBedUpdateState'

interface BedDashboardClientProps {
  initialData: BedGridData
}

const UPDATE_TIMEOUT_MS = 2000
const SUCCESS_FEEDBACK_MS = 3000

function isNonPatientStage(stageName: string): boolean {
  const normalized = stageName.trim().toLowerCase()
  return normalized === 'empty' || normalized === 'cleaning'
}

export function BedDashboardClient({ initialData }: BedDashboardClientProps) {
  const router = useRouter()
  const [data, setData] = useState<BedGridData>(initialData)
  const [updatingBedId, setUpdatingBedId] = useState<string | null>(null)
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null)
  
  // Use custom hooks for timer management (prevents memory leaks)
  const { errorByBedId, setTemporaryError, clearError } = useErrorTimers()
  const { lastUpdatedBedId, lastUpdatedStageId, showSuccessFeedback } = 
    useSuccessFeedback(SUCCESS_FEEDBACK_MS)
  
  const updateTimeoutTimer = useRef<NodeJS.Timeout | null>(null)

  const stageById = useMemo(() => {
    const map = new Map<string, Stage>()
    data.stages.forEach((stage) => map.set(stage.id, stage))
    return map
  }, [data.stages])

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  const handleBedClick = useCallback((bed: BedWithElapsedTime) => {
    // TODO US-1.2: Open bed details modal or navigate to bed page
    void bed
  }, [])

  const handleStageSelect = useCallback(
    async (bedId: string, stageId: string) => {
      if (updatingBedId) {
        setTemporaryError(bedId, 'Update in progress, please wait.')
        return
      }

      const stage = stageById.get(stageId)
      const previousBed = data.beds.find((bed) => bed.id === bedId)

      if (!stage || !previousBed) {
        setTemporaryError(bedId, 'Unable to find bed or stage.')
        return
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

      // Optimistic update
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
        const updatePromise = updateBedStage({ bedId, toStageId: stageId })

        // Track update timeout for cleanup
        const timeoutPromise = new Promise<never>((_, reject) => {
          updateTimeoutTimer.current = setTimeout(
            () => reject(new Error('Update took too long (>2 seconds)')),
            UPDATE_TIMEOUT_MS
          )
        })

        const result = await Promise.race([updatePromise, timeoutPromise])

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to update stage')
        }

        // US-3.1: Use server-provided timestamps for accuracy
        const serverPatientStartTime = result.data.patientStartTime
          ? new Date(result.data.patientStartTime)
          : null
        const serverLastStageChange = result.data.lastStageChange
          ? new Date(result.data.lastStageChange)
          : now

        // Update with server data
        setData((prev) => ({
          ...prev,
          beds: prev.beds.map((bed) =>
            bed.id === bedId
              ? {
                  ...bed,
                  currentStageId: stageId,
                  currentStage: stage,
                  lastStageChange: serverLastStageChange,
                  isOccupied: result.data.isOccupied,
                  patientStartTime: serverPatientStartTime,
                  elapsedTimeMs: result.data.isOccupied ? 0 : null,
                  isDelayed: false,
                }
              : bed
          ),
        }))

        showSuccessFeedback(bedId, stageId)
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update stage'
        setTemporaryError(bedId, message)
        
        // Rollback optimistic update
        setData((prev) => ({
          ...prev,
          beds: prev.beds.map((bed) => (bed.id === bedId ? previousBed : bed)),
        }))
        router.refresh()
      } finally {
        setUpdatingBedId(null)
        setUpdatingStageId(null)
        updateTimeoutTimer.current = null
      }
    },
    [data.beds, stageById, updatingBedId, router, setTemporaryError, clearError, showSuccessFeedback]
  )

  return (
    <BedGrid
      data={data}
      onRefresh={handleRefresh}
      onBedClick={handleBedClick}
      onStageSelect={handleStageSelect}
      updatingBedId={updatingBedId}
      updatingStageId={updatingStageId}
      lastUpdatedBedId={lastUpdatedBedId}
      lastUpdatedStageId={lastUpdatedStageId}
      errorByBedId={errorByBedId}
    />
  )
}
