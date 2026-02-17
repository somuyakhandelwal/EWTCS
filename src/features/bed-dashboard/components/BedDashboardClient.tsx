// Bed Dashboard Client Wrapper
// Epic 1: Nurse Desk Bed Dashboard
// US-1.2: Real-time updates with intelligent polling

'use client'

import { useCallback, useEffect } from 'react'
import { BedGrid } from './BedGrid'
import { ConnectionStatus } from './ConnectionStatus'
import { useRealtimeBedUpdates } from '../hooks/useRealtimeBedUpdates'
import { useBedStageUpdate } from '../hooks/useBedStageUpdate'
import type { BedGridData, BedWithElapsedTime } from '../types/bed'

interface BedDashboardClientProps {
  initialData: BedGridData
}

export function BedDashboardClient({ initialData }: BedDashboardClientProps) {
  // Real-time updates hook with intelligent polling
  const { data: realtimeData, connectionStatus, isLoading, refresh, reconnect } =
    useRealtimeBedUpdates(initialData)

  // Stage update hook with optimistic updates
  const {
    data,
    updatingBedId,
    updatingStageId,
    lastUpdatedBedId,
    lastUpdatedStageId,
    errorByBedId,
    handleStageSelect,
    setData,
  } = useBedStageUpdate(realtimeData)

  // Sync real-time data with local state (when not updating)
  useEffect(() => {
    if (!updatingBedId) {
      setData(realtimeData)
    }
  }, [realtimeData, updatingBedId, setData])

  const handleRefresh = useCallback(async () => {
    await refresh()
  }, [refresh])

  const handleBedClick = useCallback((bed: BedWithElapsedTime) => {
    // TODO: Open bed details modal or navigate to bed page
    void bed // Unused parameter (future implementation)
  }, [])

  return (
    <div className="space-y-4">
      {/* Connection Status Indicator */}
      <div className="flex justify-end">
        <ConnectionStatus status={connectionStatus} onReconnect={reconnect} />
      </div>

      {/* Bed Grid with real-time data */}
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
        isRefreshing={isLoading}
      />
    </div>
  )
}

