// Bed Dashboard Client Wrapper
// Epic 1: Nurse Desk Bed Dashboard
// US-1.2: Real-time updates with intelligent polling

'use client'

import { useCallback } from 'react'
import { BedGrid } from './BedGrid'
import { ConnectionStatus } from './ConnectionStatus'
import { useRealtimeBedUpdates } from '../hooks/useRealtimeBedUpdates'
import type { BedGridData, BedWithElapsedTime } from '../types/bed'

interface BedDashboardClientProps {
  initialData: BedGridData
}

export function BedDashboardClient({ initialData }: BedDashboardClientProps) {
  // Real-time updates hook with intelligent polling
  const { data, connectionStatus, isLoading, refresh, reconnect } = useRealtimeBedUpdates(initialData)

  const handleRefresh = useCallback(async () => {
    await refresh()
  }, [refresh])

  const handleBedClick = useCallback((bed: BedWithElapsedTime) => {
    // TODO: Open bed details modal or navigate to bed page
    // Future: router.push(`/dashboard/beds/${bed.id}`)
    console.log('Bed clicked:', bed.bedNumber)
  }, [])

  return (
    <div className="space-y-4">
      {/* Connection Status Indicator */}
      <div className="flex justify-end">
        <ConnectionStatus 
          status={connectionStatus} 
          onReconnect={reconnect}
        />
      </div>

      {/* Bed Grid with real-time data */}
      <BedGrid
        data={data}
        onRefresh={handleRefresh}
        onBedClick={handleBedClick}
        isRefreshing={isLoading}
      />
    </div>
  )
}
