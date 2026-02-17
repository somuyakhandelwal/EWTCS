// Bed Dashboard Client Wrapper
// Epic 1: Nurse Desk Bed Dashboard
// US-1.2: Real-time updates with intelligent polling

'use client'

import { useCallback, useEffect } from 'react'
import { BedGrid } from './BedGrid'
import { ConnectionStatus } from './ConnectionStatus'
import type { BedGridData, BedWithElapsedTime } from '../types/bed'
import { useRealtimeBedUpdates } from '../hooks/useRealtimeBedUpdates'
import { useBedStageUpdate } from '../hooks/useBedStageUpdate'

interface BedDashboardClientProps {
  initialData: BedGridData
}

export function BedDashboardClient({ initialData }: BedDashboardClientProps) {
  // Hook for real-time polling and connection status
  const {
    data: realtimeData,
    connectionStatus,
    isLoading,
    refresh,
    reconnect,
  } = useRealtimeBedUpdates(initialData)

  // Hook for bed stage updates with optimistic updates and error handling
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

  // Sync realtime data to bed stage update hook
  useEffect(() => {
    setData(realtimeData)
  }, [realtimeData, setData])

  const handleRefresh = useCallback(async () => {
    await refresh()
  }, [refresh])

  const handleBedClick = useCallback((bed: BedWithElapsedTime) => {
    // TODO US-1.2: Open bed details modal or navigate to bed page
    void bed
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

