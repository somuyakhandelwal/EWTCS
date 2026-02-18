// Supervisor Bed Overview Component
// Epic 1: Nurse Desk Bed Dashboard (US-1.7)
// Purpose: Read-only bed status view for supervisors — shows delays,
//   bottleneck beds, and recorded reasons for delay.

'use client'

import { useTransition } from 'react'
import { BedGridStats } from './BedGridStats'
import { BedStatusLegend } from './BedStatusLegend'
import { BottleneckPanel } from './BottleneckPanel'
import { BedCard } from './BedCard'
import { Button } from '@/shared/components/ui/button'
import { RefreshCw } from 'lucide-react'
import type { BedGridData } from '../types/bed'
import { getBedGridData } from '../actions/bed-grid-actions'
import { getBedStatistics } from '../lib/utils'
import { useState, useCallback, useMemo } from 'react'

interface SupervisorBedOverviewProps {
  initialData: BedGridData
}

export function SupervisorBedOverview({ initialData }: SupervisorBedOverviewProps) {
  const [data, setData] = useState<BedGridData>(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [, startTransition] = useTransition()

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

  return (
    <div className="space-y-6">
      {/* Stats */}
      <BedGridStats
        total={stats.total}
        occupied={stats.occupied}
        available={stats.available}
        delayed={stats.delayed}
        bottleneckCount={data.bottleneckCount}
      />

      {/* Legend */}
      <BedStatusLegend stages={data.stages} />

      {/* Bottleneck panel — supervisor can see + trigger refresh after update */}
      <BottleneckPanel beds={data.beds} onReasonRecorded={handleRefresh} />

      {/* Delayed / bottleneck bed cards (read-only — no stage update controls) */}
      {delayedBeds.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
              Beds Requiring Attention ({delayedBeds.length})
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {delayedBeds.map(bed => (
              <BedCard key={bed.id} bed={bed} />
            ))}
          </div>
        </div>
      )}

      {delayedBeds.length === 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 py-10 text-center">
          <p className="text-zinc-400">🎉 No delayed beds — all patients are on track.</p>
        </div>
      )}
    </div>
  )
}
