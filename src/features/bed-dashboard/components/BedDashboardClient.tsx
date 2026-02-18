'use client'

import { useCallback, useMemo, useState } from 'react'
import { BedGrid } from './BedGrid'
import { BedHistoryModal } from './BedHistoryModal'
import type { BedGridData, BedWithElapsedTime, Stage } from '../types/bed'
import { updateBedStage, getBedHistory } from '../actions/bed-actions'

interface BedDashboardClientProps {
  initialData: BedGridData
}

interface HistoryState {
  isOpen: boolean
  isLoading: boolean
  bedId: string | null
  bedNumber: string | null
  data: any[]
}

export function BedDashboardClient({ initialData }: BedDashboardClientProps) {
  const [data] = useState<BedGridData>(initialData)
  const [updatingBedId, setUpdatingBedId] = useState<string | null>(null)
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null)
  const [errorByBedId, setErrorByBedId] = useState<Record<string, string | null>>({})
  const [lastUpdatedBedId, setLastUpdatedBedId] = useState<string | null>(null)
  const [lastUpdatedStageId, setLastUpdatedStageId] = useState<string | null>(null)

  const [historyState, setHistoryState] = useState<HistoryState>({
    isOpen: false,
    isLoading: false,
    bedId: null,
    bedNumber: null,
    data: [],
  })

  const stageById = useMemo(() => {
    const map = new Map<string, Stage>()
    data.stages.forEach((stage) => map.set(stage.id, stage))
    return map
  }, [data.stages])

  const handleRefresh = useCallback(() => {
    // Refresh logic can be added later
  }, [])

  const handleBedClick = useCallback(async (bed: BedWithElapsedTime) => {
    if (!bed.isOccupied) return

    setHistoryState(prev => ({
      ...prev,
      isOpen: true,
      isLoading: true,
      bedId: bed.id,
      bedNumber: bed.bedNumber,
      data: [],
    }))

    try {
      const result = await getBedHistory(bed.id)
      if (result.success) {
        setHistoryState(prev => ({
          ...prev,
          isLoading: false,
          data: result.data || [],
        }))
      } else {
        setHistoryState(prev => ({ ...prev, isLoading: false }))
        setErrorByBedId(prev => ({ ...prev, [bed.id]: result.error || 'Failed to fetch history' }))
      }
    } catch (error) {
      setHistoryState(prev => ({ ...prev, isLoading: false }))
      setErrorByBedId(prev => ({ ...prev, [bed.id]: 'Connection error while fetching history' }))
    }
  }, [])

  const handleCloseHistory = useCallback(() => {
    setHistoryState(prev => ({ ...prev, isOpen: false }))
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
    <>
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

      <BedHistoryModal
        isOpen={historyState.isOpen}
        onClose={handleCloseHistory}
        bedNumber={historyState.bedNumber}
        history={historyState.data}
        isLoading={historyState.isLoading}
      />
    </>
  )
}


