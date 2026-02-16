// Bed Dashboard Client Wrapper
// Epic 1: Nurse Desk Bed Dashboard
// This component wraps the BedGrid to handle client-side interactions

'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BedGrid } from './BedGrid'
import type { BedGridData, BedWithElapsedTime } from '../types/bed'
import { updateBedStage } from '../actions/bed-actions'

interface BedDashboardClientProps {
  initialData: BedGridData
}

export function BedDashboardClient({ initialData }: BedDashboardClientProps) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [updating, setUpdating] = useState<{ bedId: string; stageId: string } | null>(null)
  const [lastUpdated, setLastUpdated] = useState<{ bedId: string; stageId: string } | null>(null)
  const [errorByBedId, setErrorByBedId] = useState<Record<string, string | null>>({})

  const handleRefresh = useCallback(() => {
    // Use Next.js router to refresh server components
    router.refresh()
  }, [router])

  const handleBedClick = useCallback((bed: BedWithElapsedTime) => {
    // TODO US-1.2: Open bed details modal or navigate to bed page
    // Future: router.push(`/dashboard/beds/${bed.id}`)
    void bed
  }, [])

  const handleStageSelect = useCallback(async (bedId: string, stageId: string) => {
    // Prevent double-clicks and concurrent updates
    if (updating) {
      // Show feedback that an update is already in progress
      if (updating.bedId === bedId) {
        setErrorByBedId((prev) => ({ ...prev, [bedId]: 'Update in progress, please wait...' }))
        setTimeout(() => setErrorByBedId((prev) => ({ ...prev, [bedId]: null })), 1500)
      }
      return
    }

    setUpdating({ bedId, stageId })
    setErrorByBedId((prev) => ({ ...prev, [bedId]: null }))

    // Add 2-second timeout to meet US-2.1 acceptance criterion
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Update took too long (>2 seconds)')), 2000)
    )

    let result
    try {
      result = await Promise.race([
        updateBedStage({ bedId, toStageId: stageId }),
        timeoutPromise,
      ]) as Awaited<ReturnType<typeof updateBedStage>>
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request timeout'
      setErrorByBedId((prev) => ({ ...prev, [bedId]: message }))
      setUpdating(null)
      
      // Auto-clear timeout error after 5 seconds
      setTimeout(() => {
        setErrorByBedId((prev) => {
          if (prev[bedId] === message) {
            return { ...prev, [bedId]: null }
          }
          return prev
        })
      }, 5000)
      return
    }

    if (!result.success || !result.data) {
      const validationErrors = result.errors
        ? Object.values(result.errors).flat().filter(Boolean)
        : []
      const message = result.message || validationErrors[0] || 'Failed to update bed stage'
      setErrorByBedId((prev) => ({ ...prev, [bedId]: message }))
      setUpdating(null)
      
      // Auto-clear error after 5 seconds so nurses don't see stale errors
      setTimeout(() => {
        setErrorByBedId((prev) => {
          if (prev[bedId] === message) {
            return { ...prev, [bedId]: null }
          }
          return prev
        })
      }, 5000)
      return
    }

    setData((prev) => {
      const nextBeds = prev.beds.map((bed) => {
        if (bed.id !== bedId) return bed

        const stage = prev.stages.find((item) => item.id === stageId) || bed.currentStage
        const patientStartTime = result.data?.patientStartTime
          ? new Date(result.data.patientStartTime)
          : null
        const lastStageChange = result.data?.lastStageChange
          ? new Date(result.data.lastStageChange)
          : new Date()

        return {
          ...bed,
          currentStageId: stageId,
          currentStage: stage,
          lastStageChange,
          isOccupied: result.data.isOccupied,
          patientStartTime,
          elapsedTimeMs: result.data.isOccupied ? 0 : null,
          isDelayed: false,
        }
      })

      return { ...prev, beds: nextBeds }
    })

    setLastUpdated({ bedId, stageId })
    setUpdating(null)
    setTimeout(() => setLastUpdated(null), 3000)
    router.refresh()
  }, [router, updating])

  return (
    <BedGrid
      data={data}
      onRefresh={handleRefresh}
      onBedClick={handleBedClick}
      onStageSelect={handleStageSelect}
      updatingBedId={updating?.bedId || null}
      updatingStageId={updating?.stageId || null}
      lastUpdatedBedId={lastUpdated?.bedId || null}
      lastUpdatedStageId={lastUpdated?.stageId || null}
      errorByBedId={errorByBedId}
    />
  )
}
