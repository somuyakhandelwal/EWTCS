'use client'

import { useState, useMemo, useCallback, type MouseEvent } from 'react'
import { BedCard } from './BedCard'
import { BedStatusLegend } from './BedStatusLegend'
import { BedStageContextMenu } from './BedStageContextMenu'
import { BottleneckPanel } from './BottleneckPanel'
import { BedGridStats } from './BedGridStats'
import { Button } from '@/shared/components/ui/button'
import { Filter, RefreshCw } from 'lucide-react'
import type { BedGridData, BedWithElapsedTime, DispositionDelayReason } from '../types/bed'
import { getBedStatistics } from '../lib/utils'
import { getValidTransitionsForBed } from '../actions/bed-grid-actions'

interface BedGridProps {
  data: BedGridData
  searchQuery?: string
  onRefresh?: () => void
  onBedClick?: (bed: BedWithElapsedTime) => void
  onStageSelect?: (bedId: string, stageId: string) => void
  onReasonSelect?: (bedId: string, reason: DispositionDelayReason) => void
  updatingBedId?: string | null
  updatingStageId?: string | null
  lastUpdatedBedId?: string | null
  lastUpdatedStageId?: string | null
  errorByBedId?: Record<string, string>
  isRefreshing?: boolean
}

export function BedGrid({
  data,
  searchQuery = '',
  onRefresh,
  onBedClick,
  onStageSelect,
  onReasonSelect,
  updatingBedId = null,
  updatingStageId = null,
  lastUpdatedBedId = null,
  lastUpdatedStageId = null,
  errorByBedId = {},
  isRefreshing = false,
}: BedGridProps) {
  const [showDelayedOnly, setShowDelayedOnly] = useState(false)
  const [menuState, setMenuState] = useState<{
    bedId: string
    position: { x: number; y: number }
  } | null>(null)
  const [validNextStages, setValidNextStages] = useState<string[]>([])
  const [overrideRequiredStages, setOverrideRequiredStages] = useState<string[]>([])
  const [isLoadingTransitions, setIsLoadingTransitions] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)

<<<<<<< feature/issue-14-search-bed-by-number
  // Memoize filtered beds to prevent unnecessary recalculation
  const displayedBeds = useMemo(() => {
    const base = showDelayedOnly ? data.beds.filter(b => b.isDelayed) : data.beds
    if (!searchQuery.trim()) return base
    const q = searchQuery.toLowerCase()
    return base.filter(bed => {
      if (bed.bedNumber.toLowerCase().includes(q)) return true
      if (bed.currentStage?.name.toLowerCase().includes(q)) return true
      return false
    })
  }, [data.beds, showDelayedOnly, searchQuery])

  // Memoize statistics calculation
=======
  const displayedBeds = useMemo(
    () => showDelayedOnly ? data.beds.filter(bed => bed.isDelayed) : data.beds,
    [data.beds, showDelayedOnly]
  )
>>>>>>> main
  const stats = useMemo(() => getBedStatistics(data.beds), [data.beds])

  const toggleFilter = useCallback(() => {
    setShowDelayedOnly(prev => !prev)
  }, [])

<<<<<<< feature/issue-14-search-bed-by-number
  const handleOpenMenu = useCallback(
    async (event: MouseEvent<HTMLDivElement>, bed: BedWithElapsedTime) => {
      if (!onStageSelect) {
        return
      }
      event.preventDefault()
      setMenuState({
        bedId: bed.id,
        position: { x: event.clientX, y: event.clientY },
      })
      setMenuError(null)

      // Fetch valid transitions for this bed
      setIsLoadingTransitions(true)
      try {
        const result = await getValidTransitionsForBed(bed.id)
        if (result.success && result.allowed) {
          setValidNextStages(result.allowed)
          setOverrideRequiredStages(result.requiresOverride || [])
        } else {
          // BUG FIX #2: Show error message when transitions can't be loaded
          setMenuError(result.error || 'Unable to load available stages')
          setValidNextStages([])
          setOverrideRequiredStages([])
        }
      } catch (error) {
        // BUG FIX #2: Catch and display error to user
        console.error('Failed to fetch valid transitions:', error)
        setMenuError('Connection error. Please try again.')
        setValidNextStages([])
        setOverrideRequiredStages([])
      } finally {
        setIsLoadingTransitions(false)
=======
  const openMenuForBed = useCallback(async (bedId: string, position: { x: number; y: number }) => {
    setMenuState({ bedId, position })
    setIsLoadingTransitions(true)
    try {
      const result = await getValidTransitionsForBed(bedId)
      if (result.success) {
        setValidNextStages(result.allowed || [])
        setOverrideRequiredStages(result.requiresOverride || [])
>>>>>>> main
      }
    } catch { /* fallback */ } finally { setIsLoadingTransitions(false) }
  }, [])

  // Right-click (desktop)
  const handleOpenMenu = useCallback(async (event: MouseEvent<HTMLDivElement>, bed: BedWithElapsedTime) => {
    if (!onStageSelect) return
    event.preventDefault()
    await openMenuForBed(bed.id, { x: event.clientX, y: event.clientY })
  }, [onStageSelect, openMenuForBed])

  // Tap (mobile) — centre of viewport for bottom-sheet positioning
  const handleBedTap = useCallback(async (bed: BedWithElapsedTime) => {
    if (!onStageSelect) return
    await openMenuForBed(bed.id, { x: window.innerWidth / 2 - 96, y: window.innerHeight / 2 })
  }, [onStageSelect, openMenuForBed])

  const handleCloseMenu = useCallback(() => {
    setMenuState(null)
    setValidNextStages([])
    setOverrideRequiredStages([])
    setMenuError(null)
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
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics bar */}
      <BedGridStats
        total={stats.total}
        occupied={stats.occupied}
        available={stats.available}
        delayed={stats.delayed}
        bottleneckCount={data.bottleneckCount}
      />

      {/* Legend */}
      <BedStatusLegend stages={data.stages} />

      {/* US-1.6: Disposition bottleneck panel */}
      <BottleneckPanel beds={data.beds} onReasonRecorded={onRefresh} />

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
              onClick={onStageSelect ? handleBedTap : onBedClick}
              onContextMenu={handleOpenMenu}
              onReasonSelect={onReasonSelect}
              showUpdated={lastUpdatedBedId === bed.id && lastUpdatedStageId !== null}
              errorMessage={errorByBedId[bed.id] || null}
              searchQuery={searchQuery}
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
          isUpdating={Boolean(updatingBedId) || isLoadingTransitions}
          updatingStageId={updatingStageId}
          validNextStages={validNextStages}
          overrideRequiredStages={overrideRequiredStages}
          error={menuError}
          onStageSelect={onStageSelect}
          onClose={handleCloseMenu}
        />
      )}

      <div className="text-center text-xs text-zinc-500">
        Showing {displayedBeds.length} of {data.beds.length} beds
        {showDelayedOnly && ' (delayed only)'}
      </div>
    </div>
  )
}
