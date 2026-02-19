/**
 * SupervisorBedOverview.tsx
 * 
 * Provides a specialized dashboard view for supervisors.
 * 
 * Key Features:
 * - Read-only view of bed status (no stage mutation controls)
 * - Focus on delays and bottlenecks
 * - Ability to view bed history and initiate corrections
 * - Integrated bottleneck panel for managing disposition delays
 * 
 * This component is optimized for monitoring and audit, rather than current-state operations.
 */

'use client'

import { useTransition, useState, useCallback, useMemo } from 'react'
import { BedStatusLegend } from './BedStatusLegend'
import { BottleneckPanel } from './BottleneckPanel'
import type { BedGridData } from '../types/bed'
import { getBedGridData } from '../actions/bed-grid-actions'
import { getBedStatistics } from '../lib/utils'
import { useBedHistory } from '../hooks/useBedHistory'
import { BedHistoryModal } from './BedHistoryModal'
import { SupervisorStats } from './SupervisorStats'
import { SupervisorDelayedList } from './SupervisorDelayedList'

interface SupervisorBedOverviewProps {
  initialData: BedGridData
}

export function SupervisorBedOverview({ initialData }: SupervisorBedOverviewProps) {
  const [data, setData] = useState<BedGridData>(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [, startTransition] = useTransition()

  const {
    isOpen: isHistoryOpen,
    isLoading: isHistoryLoading,
    history,
    selectedBedNumber,
    fetchHistory,
    closeHistory,
    refreshHistory
  } = useBedHistory()

  const stats = useMemo(() => getBedStatistics(data.beds), [data.beds])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const result = await getBedGridData()
      if (result.success && result.data) {
        startTransition(() => setData(result.data!))
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const delayedBeds = useMemo(
    () => data.beds.filter(b => b.isDelayed || b.isDispositionBottleneck),
    [data.beds]
  )

  const handleBedClick = useCallback((bedId: string, bedNumber: string) => {
    fetchHistory(bedId, bedNumber)
  }, [fetchHistory])

  return (
    <div className="space-y-6">
      <SupervisorStats stats={stats} bottleneckCount={data.bottleneckCount} />

      {/* Legend */}
      <BedStatusLegend stages={data.stages} />

      <BottleneckPanel beds={data.beds} onReasonRecorded={handleRefresh} />

      <SupervisorDelayedList
        delayedBeds={delayedBeds}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onBedClick={handleBedClick}
      />

      <BedHistoryModal
        isOpen={isHistoryOpen}
        onClose={closeHistory}
        bedNumber={selectedBedNumber}
        history={history}
        isLoading={isHistoryLoading}
        canEdit={true}
        onHistoryUpdate={refreshHistory}
      />
    </div>
  )
}
