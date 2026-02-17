'use client'

import { useCallback, useMemo, useState } from 'react'
import { BedGrid } from './BedGrid'
import type { BedGridData, BedWithElapsedTime, Stage } from '../types/bed'
import { updateBedStage } from '../actions/bed-actions'

interface BedDashboardClientProps {
  initialData: BedGridData
}

export function BedDashboardClient({ initialData }: BedDashboardClientProps) {
  const [data] = useState<BedGridData>(initialData)
  const [updatingBedId, setUpdatingBedId] = useState<string | null>(null)
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null)
  const [errorByBedId, setErrorByBedId] = useState<Record<string, string | null>>({})
  const [lastUpdatedBedId, setLastUpdatedBedId] = useState<string | null>(null)
  const [lastUpdatedStageId, setLastUpdatedStageId] = useState<string | null>(null)

  const stageById = useMemo(() => {
    const map = new Map<string, Stage>()
    data.stages.forEach((stage) => map.set(stage.id, stage))
    return map
  }, [data.stages])

  const handleRefresh = useCallback(() => {
    // Refresh logic can be added later
  }, [])

  const handleBedClick = useCallback((bed: BedWithElapsedTime) => {
    // TODO: Open bed details modal or navigate to bed page
    void bed
  }, [])

  const handleStageSelect = useCallback(
    async (bedId: string, stageId: string) => {
      if (updatingBedId) {
        setErrorByBedId((prev) => ({
          ...prev,
          [bedId]: 'Update in progress, please wait.',
        }))
        return
      }

      const stage = stageById.get(stageId)
      if (!stage) {
        setErrorByBedId((prev) => ({
          ...prev,
          [bedId]: 'Unable to find stage.',
        }))
        return
      }

      setUpdatingBedId(bedId)
      setUpdatingStageId(stageId)
      setErrorByBedId((prev) => ({
        ...prev,
        [bedId]: null,
      }))

      try {
        const result = await updateBedStage({ bedId, toStageId: stageId })

        if (!result.success) {
          throw new Error('Failed to update stage')
        }

        setLastUpdatedBedId(bedId)
        setLastUpdatedStageId(stageId)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update stage'
        setErrorByBedId((prev) => ({
          ...prev,
          [bedId]: message,
        }))
      } finally {
        setUpdatingBedId(null)
        setUpdatingStageId(null)
      }
    },
    [updatingBedId, stageById]
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

