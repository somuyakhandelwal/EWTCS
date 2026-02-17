// Bed Dashboard Client Wrapper
// Epic 1: Nurse Desk Bed Dashboard
// This component wraps the BedGrid to handle client-side interactions

'use client'

import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BedGrid } from './BedGrid'
import type { BedGridData, BedWithElapsedTime, Stage } from '../types/bed'
import { updateBedStage } from '../actions/bed-actions'

interface BedDashboardClientProps {
  initialData: BedGridData
}

const UPDATE_TIMEOUT_MS = 2000
const SUCCESS_FEEDBACK_MS = 3000
const ERROR_CLEAR_MS = 5000

function isNonPatientStage(stageName: string): boolean {
  const normalized = stageName.trim().toLowerCase()
  return normalized === 'empty' || normalized === 'cleaning'
}

export function BedDashboardClient({ initialData }: BedDashboardClientProps) {
  const router = useRouter()
  const [data, setData] = useState<BedGridData>(initialData)
  const [updatingBedId, setUpdatingBedId] = useState<string | null>(null)
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null)
  const [lastUpdatedBedId, setLastUpdatedBedId] = useState<string | null>(null)
  const [lastUpdatedStageId, setLastUpdatedStageId] = useState<string | null>(null)
  const [errorByBedId, setErrorByBedId] = useState<Record<string, string>>({})

  // FIX for Issue #1 (Memory Leak): Track all timers for cleanup
  const timeoutRefs = useRef<{
    errorClearTimers: Map<string, NodeJS.Timeout>
    successTimer: NodeJS.Timeout | null
    updateTimeoutTimer: NodeJS.Timeout | null
  }>({
    errorClearTimers: new Map(),
    successTimer: null,
    updateTimeoutTimer: null,
  })

  // Cleanup: clear all timers on unmount
  useEffect(() => {
    const refs = timeoutRefs.current
    return () => {
      // Clear all error timers
      refs.errorClearTimers.forEach((timer) => clearTimeout(timer))
      refs.errorClearTimers.clear()

      // Clear success timer
      if (refs.successTimer) {
        clearTimeout(refs.successTimer)
      }

      // Clear update timeout timer
      if (refs.updateTimeoutTimer) {
        clearTimeout(refs.updateTimeoutTimer)
      }
    }
  }, [])

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

  const setTemporaryError = useCallback((bedId: string, message: string) => {
    setErrorByBedId((prev) => ({ ...prev, [bedId]: message }))

    // FIX for Issue #1 (Memory Leak): Clear previous timer for this bed before setting new one
    const previousTimer = timeoutRefs.current.errorClearTimers.get(bedId)
    if (previousTimer) {
      clearTimeout(previousTimer)
    }

    const timer = setTimeout(() => {
      setErrorByBedId((prev) => {
        if (!prev[bedId]) {
          return prev
        }
        const next = { ...prev }
        delete next[bedId]
        return next
      })
      timeoutRefs.current.errorClearTimers.delete(bedId)
    }, ERROR_CLEAR_MS)

    timeoutRefs.current.errorClearTimers.set(bedId, timer)
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
      setErrorByBedId((prev) => {
        if (!prev[bedId]) {
          return prev
        }
        const next = { ...prev }
        delete next[bedId]
        return next
      })

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
        const updatePromise = updateBedStage({ bedId, toStageId: stageId })

        // FIX for Issue #1 (Memory Leak): Track update timeout for cleanup
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timer = setTimeout(
            () => reject(new Error('Update took too long (>2 seconds)')),
            UPDATE_TIMEOUT_MS
          )
          timeoutRefs.current.updateTimeoutTimer = timer
        })

        const result = await Promise.race([updatePromise, timeoutPromise])

        if (!result.success) {
          throw new Error(result.error || 'Failed to update stage')
        }

        setLastUpdatedBedId(bedId)
        setLastUpdatedStageId(stageId)

        // FIX for Issue #1 (Memory Leak): Track success feedback timer for cleanup
        const successTimer = setTimeout(() => {
          setLastUpdatedBedId(null)
          setLastUpdatedStageId(null)
          timeoutRefs.current.successTimer = null
        }, SUCCESS_FEEDBACK_MS)
        timeoutRefs.current.successTimer = successTimer

        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update stage'
        setTemporaryError(bedId, message)
        setData((prev) => ({
          ...prev,
          beds: prev.beds.map((bed) => (bed.id === bedId ? previousBed : bed)),
        }))
        router.refresh()
      } finally {
        setUpdatingBedId(null)
        setUpdatingStageId(null)
        timeoutRefs.current.updateTimeoutTimer = null
      }
    },
    [data.beds, stageById, updatingBedId, router, setTemporaryError]
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
