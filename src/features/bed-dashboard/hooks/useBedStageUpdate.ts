// Bed Stage Update Hook
// Handles optimistic updates, error handling, and timer management

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { updateBedStage } from '../actions/bed-actions'
import type { BedGridData, Stage } from '../types/bed'

const UPDATE_TIMEOUT_MS = 2000
const SUCCESS_FEEDBACK_MS = 3000
const ERROR_CLEAR_MS = 5000

function isNonPatientStage(stageName: string): boolean {
  const normalized = stageName.trim().toLowerCase()
  return normalized === 'empty' || normalized === 'cleaning'
}

interface UseBedStageUpdateReturn {
  data: BedGridData
  updatingBedId: string | null
  updatingStageId: string | null
  lastUpdatedBedId: string | null
  lastUpdatedStageId: string | null
  errorByBedId: Record<string, string>
  handleStageSelect: (bedId: string, stageId: string) => Promise<void>
  setData: React.Dispatch<React.SetStateAction<BedGridData>>
}

export function useBedStageUpdate(
  initialData: BedGridData
): UseBedStageUpdateReturn {
  const router = useRouter()
  const [data, setData] = useState<BedGridData>(initialData)
  const [updatingBedId, setUpdatingBedId] = useState<string | null>(null)
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null)
  const [lastUpdatedBedId, setLastUpdatedBedId] = useState<string | null>(null)
  const [lastUpdatedStageId, setLastUpdatedStageId] = useState<string | null>(
    null
  )
  const [errorByBedId, setErrorByBedId] = useState<Record<string, string>>({})

  const timeoutRefs = useRef<{
    errorClearTimers: Map<string, NodeJS.Timeout>
    successTimer: NodeJS.Timeout | null
    updateTimeoutTimer: NodeJS.Timeout | null
  }>({
    errorClearTimers: new Map(),
    successTimer: null,
    updateTimeoutTimer: null,
  })

  useEffect(() => {
    const refs = timeoutRefs.current
    return () => {
      refs.errorClearTimers.forEach((timer) => clearTimeout(timer))
      refs.errorClearTimers.clear()
      if (refs.successTimer) clearTimeout(refs.successTimer)
      if (refs.updateTimeoutTimer) clearTimeout(refs.updateTimeoutTimer)
    }
  }, [])

  const setTemporaryError = useCallback((bedId: string, message: string) => {
    setErrorByBedId((prev) => ({ ...prev, [bedId]: message }))

    const previousTimer = timeoutRefs.current.errorClearTimers.get(bedId)
    if (previousTimer) clearTimeout(previousTimer)

    const timer = setTimeout(() => {
      setErrorByBedId((prev) => {
        if (!prev[bedId]) return prev
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

      const stageMap = new Map<string, Stage>()
      data.stages.forEach((stage) => stageMap.set(stage.id, stage))
      const stage = stageMap.get(stageId)
      const previousBed = data.beds.find((bed) => bed.id === bedId)

      if (!stage || !previousBed) {
        setTemporaryError(bedId, 'Unable to find bed or stage.')
        return
      }

      setUpdatingBedId(bedId)
      setUpdatingStageId(stageId)
      setErrorByBedId((prev) => {
        if (!prev[bedId]) return prev
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

        const successTimer = setTimeout(() => {
          setLastUpdatedBedId(null)
          setLastUpdatedStageId(null)
          timeoutRefs.current.successTimer = null
        }, SUCCESS_FEEDBACK_MS)
        timeoutRefs.current.successTimer = successTimer

        router.refresh()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to update stage'
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
    [data.beds, data.stages, updatingBedId, router, setTemporaryError]
  )

  return {
    data,
    updatingBedId,
    updatingStageId,
    lastUpdatedBedId,
    lastUpdatedStageId,
    errorByBedId,
    handleStageSelect,
    setData,
  }
}
