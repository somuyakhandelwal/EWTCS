// Bed Grid Component
// Epic 1: Nurse Desk Bed Dashboard

'use client'

import { useState, useMemo, useCallback, type MouseEvent } from 'react'
import { BedCard } from './BedCard'
import { BedStatusLegend } from './BedStatusLegend'
import { BedStageContextMenu } from './BedStageContextMenu'
import { Button } from '@/shared/components/ui/button'
import { Filter, RefreshCw } from 'lucide-react'
import type { BedGridData, BedWithElapsedTime } from '../types/bed'
import { getBedStatistics } from '../lib/utils'

interface BedGridProps {
  data: BedGridData
  onRefresh?: () => void
  onBedClick?: (bed: BedWithElapsedTime) => void
  onStageSelect?: (bedId: string, stageId: string) => void
  updatingBedId?: string | null
  updatingStageId?: string | null
  lastUpdatedBedId?: string | null
  lastUpdatedStageId?: string | null
  errorByBedId?: Record<string, string>
}

export function BedGrid({
  data,
  onRefresh,
  onBedClick,
  onStageSelect,
  updatingBedId = null,
  updatingStageId = null,
  lastUpdatedBedId = null,
  lastUpdatedStageId = null,
  errorByBedId = {},
}: BedGridProps) {
  const [showDelayedOnly, setShowDelayedOnly] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [menuState, setMenuState] = useState<{
    bedId: string
    position: { x: number; y: number }
  } | null>(null)

  // Memoize filtered beds to prevent unnecessary recalculation
  const displayedBeds = useMemo(() => {
    return showDelayedOnly
      ? data.beds.filter(bed => bed.isDelayed)
      : data.beds
  }, [data.beds, showDelayedOnly])

  // Memoize statistics calculation
  const stats = useMemo(() => getBedStatistics(data.beds), [data.beds])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    onRefresh?.()
    setTimeout(() => setIsRefreshing(false), 500)
  }, [onRefresh])
  
  const toggleFilter = useCallback(() => {
    setShowDelayedOnly(prev => !prev)
  }, [])

  const handleOpenMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>, bed: BedWithElapsedTime) => {
      if (!onStageSelect) {
        return
      }
      event.preventDefault()
      setMenuState({
        bedId: bed.id,
        position: { x: event.clientX, y: event.clientY },
      })
    },
    [onStageSelect]
  )

  const handleCloseMenu = useCallback(() => {
    setMenuState(null)
  }, [])

  const activeBed = useMemo(() => {
    if (!menuState) {
      return null
    }
    return data.beds.find((bed) => bed.id === menuState.bedId) ?? null
  }, [data.beds, menuState])

  return (
    <div className="space-y-6">
      {/* Header with filters and actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFilter}
            className={showDelayedOnly ? 'bg-red-900/30 border-red-700' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showDelayedOnly ? 'Show All Beds' : 'Show Delayed Only'}
            {stats.delayed > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {stats.delayed}
              </span>
            )}
          </Button>
        </div>

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

      {/* Statistics bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
        <div>
          <p className="text-xs text-zinc-500 uppercase">Total Beds</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase">Occupied</p>
          <p className="text-2xl font-bold text-green-400">{stats.occupied}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase">Available</p>
          <p className="text-2xl font-bold text-blue-400">{stats.available}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase">Delayed</p>
          <p className="text-2xl font-bold text-red-400">{stats.delayed}</p>
        </div>
      </div>

      {/* Legend */}
      <BedStatusLegend stages={data.stages} />

      {/* Bed Grid */}
      {displayedBeds.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/30 rounded-lg border border-zinc-800">
          <p className="text-zinc-400">
            {showDelayedOnly
              ? '🎉 No delayed beds! All patients are on track.'
              : 'No beds configured in the system.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {displayedBeds.map((bed) => (
            <BedCard
              key={bed.id}
              bed={bed}
              onClick={onBedClick}
              onContextMenu={handleOpenMenu}
              showUpdated={lastUpdatedBedId === bed.id && lastUpdatedStageId !== null}
              errorMessage={errorByBedId[bed.id] || null}
            />
          ))}
        </div>
      )}

      {onStageSelect && (
        <BedStageContextMenu
          bed={activeBed}
          stages={data.stages}
          isOpen={Boolean(menuState)}
          position={menuState?.position ?? null}
          isUpdating={Boolean(updatingBedId)}
          updatingStageId={updatingStageId}
          onStageSelect={onStageSelect}
          onClose={handleCloseMenu}
        />
      )}

      {/* Footer info */}
      <div className="text-center text-xs text-zinc-500">
        Showing {displayedBeds.length} of {data.beds.length} beds
        {showDelayedOnly && ' (delayed only)'}
      </div>
    </div>
  )
}
