// Supervisor Bed Overview Component
// Epic 1: Nurse Desk Bed Dashboard (US-1.7)
// Epic 6: Surge Capacity (US-6.5)
// Purpose: Read-only bed status view for supervisors — shows delays,
//   bottleneck beds, and recorded reasons for delay.
//   Supervisors can also add and remove temporary beds.

'use client'

import { useTransition, useState, useCallback, useMemo, useEffect } from 'react'
import { BedGridStats } from './BedGridStats'
import { BedStatusLegend } from './BedStatusLegend'
import { BottleneckPanel } from './BottleneckPanel'
import { BedCard } from './BedCard'
import { Button } from '@/shared/components/ui/button'
import { RefreshCw, Zap, Trash2 } from 'lucide-react'
import type { BedGridData } from '../types/bed'
import { getBedGridData } from '../actions/bed-grid-actions'
import { getBedStatistics } from '../lib/utils'

interface SupervisorBedOverviewProps {
  initialData: BedGridData
  /** Pass the modal trigger down from the app/supervisor page (app layer) so this
   *  component stays within the bed-dashboard feature boundary. */
  onAddTempBed?: () => void
  onRemoveTempBed?: (bedId: string) => Promise<void>
  isRemovingId?: string | null
}

export function SupervisorBedOverview({
  initialData,
  onAddTempBed,
  onRemoveTempBed,
  isRemovingId,
}: SupervisorBedOverviewProps) {
  const [data, setData] = useState<BedGridData>(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [, startTransition] = useTransition()

  // US-6.5: when the shell re-fetches and passes new initialData, sync local state
  useEffect(() => {
    startTransition(() => setData(initialData))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])

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
    () => data.beds.filter(b => b.isTemporary),
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

      {/* US-6.5: Surge / Temporary Beds section */}
      <div className="rounded-lg border border-orange-900/50 bg-orange-950/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-300 uppercase tracking-wider">
            <Zap className="h-4 w-4 text-orange-400" />
            Surge Capacity
            {temporaryBeds.length > 0 && (
              <span className="ml-1 rounded-full bg-orange-800/60 px-2 py-0.5 text-[10px] font-bold text-orange-200">
                {temporaryBeds.length} active
              </span>
            )}
          </h2>
          {onAddTempBed && (
            <Button
              size="sm"
              onClick={onAddTempBed}
              className="bg-orange-700 hover:bg-orange-600 text-white border-none h-8 text-xs"
            >
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Add Temporary Bed
            </Button>
          )}
        </div>

        {temporaryBeds.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No temporary beds active. Use &ldquo;Add Temporary Bed&rdquo; during surge.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {temporaryBeds.map(bed => (
              <div key={bed.id} className="relative">
                <BedCard bed={bed} />
                {/* Remove button — only when bed is empty */}
                {!bed.isOccupied && onRemoveTempBed && (
                  <button
                    type="button"
                    disabled={isRemovingId === bed.id}
                    onClick={() => onRemoveTempBed(bed.id)}
                    className="absolute top-2 right-2 flex items-center gap-1 rounded bg-red-900/60 border border-red-700/50 px-1.5 py-0.5 text-[10px] font-semibold text-red-300 hover:bg-red-800/80 transition-colors disabled:opacity-50"
                    title="Remove temporary bed"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
