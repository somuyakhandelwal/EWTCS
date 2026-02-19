'use client'

import { useState, useMemo, useCallback, type MouseEvent } from 'react'
import { BedCard } from './BedCard'
import { BedStatusLegend } from './BedStatusLegend'
import { BedStageContextMenu } from './BedStageContextMenu'
import { BottleneckPanel } from './BottleneckPanel'
import { BedGridStats } from './BedGridStats'
import { BedGridHeader } from './BedGridHeader'
import { BedGridFooter } from './BedGridFooter'
import { useBedFilter } from '../hooks/useBedFilter'
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
  undoState?: { bedId: string; prevStageId: string; timer: number } | null
  onUndo?: () => void
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
  undoState,
  onUndo,
}: BedGridProps) {
  const [menuState, setMenuState] = useState<{
    bedId: string
    position: { x: number; y: number }
  } | null>(null)
  const [validNextStages, setValidNextStages] = useState<string[]>([])
  const [overrideRequiredStages, setOverrideRequiredStages] = useState<string[]>([])
  const [isLoadingTransitions, setIsLoadingTransitions] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)

  const {
    showDelayedOnly,
    sortOrder,
    displayedBeds,
    isFilterActive,
    toggleDelayedFilter,
    toggleSortOrder,
    clearFilter,
  } = useBedFilter(data.beds)

  const stats = useMemo(() => getBedStatistics(data.beds), [data.beds])

  const openMenuForBed = useCallback(
    async (bedId: string, position: { x: number; y: number }) => {
      setMenuState({ bedId, position })
      setMenuError(null)
      setIsLoadingTransitions(true)
      try {
        const result = await getValidTransitionsForBed(bedId)
        if (result.success && result.allowed) {
          setValidNextStages(result.allowed)
          setOverrideRequiredStages(result.requiresOverride || [])
        } else {
          setMenuError(result.error || 'Unable to load available stages')
          setValidNextStages([])
          setOverrideRequiredStages([])
        }
      } catch (error) {
        console.error('Failed to fetch valid transitions:', error)
        setMenuError('Connection error. Please try again.')
        setValidNextStages([])
        setOverrideRequiredStages([])
      } finally {
        setIsLoadingTransitions(false)
      }
    },
    []
  )

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
    if (!menuState) return null
    return data.beds.find(bed => bed.id === menuState.bedId) ?? null
  }, [data.beds, menuState])

  return (
    <div className="space-y-6">
      {/* Header with filters and actions */}
      <BedGridHeader
        showDelayedOnly={showDelayedOnly}
        sortOrder={sortOrder}
        delayedCount={stats.delayed}
        isFilterActive={isFilterActive}
        isRefreshing={isRefreshing}
        onToggleFilter={toggleDelayedFilter}
        onToggleSortOrder={toggleSortOrder}
        onClearFilter={clearFilter}
        onRefresh={onRefresh}
      />

      {/* Statistics bar */}
      <BedGridStats
        total={stats.total}
        occupied={stats.occupied}
        available={stats.available}
        delayed={stats.delayed}
        bottleneckCount={data.bottleneckCount}
      />

      {/* Legend */}
      <BedStatusLegend stages={data.stages} delayThresholdMs={data.delayThresholdMs} />

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
              showUndo={undoState?.bedId === bed.id}
              undoTimerSeconds={undoState?.bedId === bed.id ? undoState.timer : 0}
              onUndo={undoState?.bedId === bed.id ? onUndo : undefined}
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

      <BedGridFooter displayedCount={displayedBeds.length} totalCount={data.beds.length} showDelayedOnly={showDelayedOnly} sortOrder={sortOrder} />
    </div>
  )
}
