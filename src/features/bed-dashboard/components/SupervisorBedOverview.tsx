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
import type { AlertPreferences } from '@/features/notifications/types/alert-preferences'

interface SupervisorBedOverviewProps {
  initialData: BedGridData
  alertPreferences?: AlertPreferences | null
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
  alertPreferences,
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

  const userDelayThresholdMs = (alertPreferences?.thresholds.delayMinutes ?? (data.delayThresholdMs / 60000)) * 60 * 1000
  const userEscalationThresholdMs = (alertPreferences?.thresholds.escalationMinutes ?? (data.escalationThresholdMs / 60000)) * 60 * 1000
  const userBottleneckThresholdCount = alertPreferences?.thresholds.bottleneckCount ?? 1

  const delayedByUserThreshold = useMemo(
    () => data.beds.filter(bed => (bed.elapsedTimeMs ?? 0) >= userDelayThresholdMs),
    [data.beds, userDelayThresholdMs]
  )

  const escalatedByUserThreshold = useMemo(
    () => data.beds.filter(bed => (bed.elapsedTimeMs ?? 0) >= userEscalationThresholdMs),
    [data.beds, userEscalationThresholdMs]
  )

  const bottleneckBeds = useMemo(
    () => data.beds.filter(bed => bed.isDispositionBottleneck),
    [data.beds]
  )

  const showDelayedAlerts = alertPreferences?.enabledAlertTypes.delayedBeds ?? true
  const showEscalationAlerts = alertPreferences?.enabledAlertTypes.escalations ?? true
  const showBottleneckAlerts =
    (alertPreferences?.enabledAlertTypes.dispositionBottlenecks ?? true) &&
    bottleneckBeds.length >= userBottleneckThresholdCount

  const visibleDelayedBeds = useMemo(() => {
    if (!showDelayedAlerts && !showBottleneckAlerts) return []
    if (showDelayedAlerts && showBottleneckAlerts) {
      const map = new Map<string, BedGridData['beds'][number]>()
      delayedByUserThreshold.forEach((bed) => map.set(bed.id, bed))
      bottleneckBeds.forEach((bed) => map.set(bed.id, bed))
      return [...map.values()]
    }
    if (showDelayedAlerts) return delayedByUserThreshold
    return bottleneckBeds
  }, [bottleneckBeds, delayedByUserThreshold, showBottleneckAlerts, showDelayedAlerts])

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
      {showDelayedAlerts && (
        <DelayedBedCountBanner
          delayedCount={visibleDelayedBeds.length}
          onFilterDelayed={() => setShowDelayedOnly(prev => !prev)}
          isFiltered={showDelayedOnly}
        />
      )}

      {/* Stats */}
      <BedGridStats
        total={stats.total}
        occupied={stats.occupied}
        available={stats.available}
        delayed={showDelayedAlerts ? delayedByUserThreshold.length : 0}
        bottleneckCount={showBottleneckAlerts ? bottleneckBeds.length : 0}
        escalationCount={showEscalationAlerts ? escalatedByUserThreshold.length : 0}
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
      {showBottleneckAlerts && <BottleneckPanel beds={data.beds} onReasonRecorded={handleRefresh} />}

      {/* US-15.x: Delayed / bottleneck bed cards — shown when filter is active */}
      {showDelayedOnly && visibleDelayedBeds.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-card-foreground uppercase tracking-wider">
              Beds Requiring Attention ({visibleDelayedBeds.length})
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
            {visibleDelayedBeds.map(bed => (
              <BedCard key={bed.id} bed={bed} viewMode="supervisor" />
            ))}
          </div>
        </div>
      )}

      {showDelayedOnly && visibleDelayedBeds.length === 0 && (
        <div className="rounded-lg border border-border bg-card py-10 text-center">
          <p className="text-muted-foreground">🎉 No delayed beds — all patients are on track.</p>
        </div>
      )}
    </div>
  )
}