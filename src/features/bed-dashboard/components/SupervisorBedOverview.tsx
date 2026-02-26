// Supervisor Bed Overview Component
// Epic 1: Nurse Desk Bed Dashboard (US-1.7)
// Epic 6: Surge Capacity (US-6.5)
// Epic 15: Notifications & Alerts (US-15.x)
// Purpose: Read-only bed status view for supervisors — shows delays,
//   bottleneck beds, and recorded reasons for delay.
//   Supervisors can also add and remove temporary beds.

'use client'

import { useTransition, useState, useCallback, useMemo, useEffect } from 'react'
import { BedGridStats } from './BedGridStats'
import { BedStatusLegend } from './BedStatusLegend'
import { BottleneckPanel } from './BottleneckPanel'
import { BedCard } from './BedCard'
import { DelayedBedCountBanner } from './DelayedBedCountBanner'
import { Button } from '@/shared/components/ui/button'
import { RefreshCw } from 'lucide-react'
import type { BedGridData } from '../types/bed'
import { getBedGridData } from '../actions/bed-grid-actions'
import { getBedStatistics } from '../lib/utils'
import { VirtualBedsSection } from './VirtualBedsSection'
import { SupervisorTemporaryBeds } from './SupervisorTemporaryBeds'

interface SupervisorBedOverviewProps {
  initialData: BedGridData
  /** Pass the modal trigger down from the app/supervisor page (app layer) so this
   *  component stays within the bed-dashboard feature boundary. */
  onAddTempBed?: () => void
  onRemoveTempBed?: (bedId: string) => Promise<void>
  isRemovingId?: string | null
  /** US-6.6: virtual bed controls */
  onAddVirtualBed?: () => void
  onRemoveVirtualBed?: (bedId: string) => Promise<void>
}

export function SupervisorBedOverview({
  initialData,
  onAddTempBed,
  onRemoveTempBed,
  isRemovingId,
  onAddVirtualBed,
  onRemoveVirtualBed,
}: SupervisorBedOverviewProps) {
  const [data, setData] = useState<BedGridData>(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showDelayedOnly, setShowDelayedOnly] = useState(false)
  const [, startTransition] = useTransition()

  // US-6.5: when the shell re-fetches and passes new initialData, sync local state
  useEffect(() => {
    startTransition(() => setData(initialData))
  }, [initialData, startTransition])

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

  // US-6.5: all temporary beds visible to supervisor
  const temporaryBeds = useMemo(
    () => data.beds.filter(b => b.isTemporary && !b.isVirtual),
    [data.beds]
  )

  // US-6.6: all virtual beds visible to supervisor
  const virtualBeds = useMemo(
    () => data.beds.filter(b => b.isVirtual),
    [data.beds]
  )

  return (
    <div className="space-y-6">

      {/* US-15.x: Prominent delayed bed count banner with color coding + click-to-filter */}
      <DelayedBedCountBanner
        delayedCount={delayedBeds.length}
        onFilterDelayed={() => setShowDelayedOnly(prev => !prev)}
        isFiltered={showDelayedOnly}
      />

      {/* Stats */}
      <BedGridStats
        total={stats.total}
        occupied={stats.occupied}
        available={stats.available}
        delayed={stats.delayed}
        bottleneckCount={data.bottleneckCount}
        escalationCount={data.escalationCount}
      />

      {/* Legend */}
      <BedStatusLegend
        stages={data.stages}
        delayThresholdMs={data.delayThresholdMs}
        escalationThresholdMs={data.escalationThresholdMs}
      />

      {/* US-6.5: Surge / Temporary Beds section */}
      <SupervisorTemporaryBeds
        temporaryBeds={temporaryBeds}
        onAddTempBed={onAddTempBed}
        onRemoveTempBed={onRemoveTempBed}
        isRemovingId={isRemovingId}
      />

      {/* US-6.6: Virtual / Hallway Beds section */}
      <VirtualBedsSection
        virtualBeds={virtualBeds}
        onAddVirtualBed={onAddVirtualBed}
        onRemoveVirtualBed={onRemoveVirtualBed}
      />

      {/* Bottleneck panel — supervisor can see + trigger refresh after update */}
      <BottleneckPanel beds={data.beds} onReasonRecorded={handleRefresh} />

      {/* US-15.x: Delayed / bottleneck bed cards — shown when filter is active */}
      {showDelayedOnly && delayedBeds.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-card-foreground uppercase tracking-wider">
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
              <BedCard key={bed.id} bed={bed} viewMode="supervisor" />
            ))}
          </div>
        </div>
      )}

      {showDelayedOnly && delayedBeds.length === 0 && (
        <div className="rounded-lg border border-border bg-card py-10 text-center">
          <p className="text-muted-foreground">🎉 No delayed beds — all patients are on track.</p>
        </div>
      )}
    </div>
  )
}