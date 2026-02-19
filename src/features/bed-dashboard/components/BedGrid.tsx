'use client'

import { useState, useMemo, useCallback, type MouseEvent } from 'react'
import { BedCard } from './BedCard'
import { BedStatusLegend } from './BedStatusLegend'
import { BedStageContextMenu } from './BedStageContextMenu'
import { BottleneckPanel } from './BottleneckPanel'
import { BedGridStats } from './BedGridStats'
import { BedGridToolbar } from './BedGridToolbar'
import type { BedGridData, BedWithElapsedTime, DispositionDelayReason } from '../types/bed'
import { getBedStatistics } from '../lib/utils'
import { getValidTransitionsForBed } from '../actions/bed-grid-actions'

/**
 * Props for the BedGrid component
 * 
 * @property {BedGridData} data - The core data object containing beds, stages, and stats
 * @property {() => void} [onRefresh] - Callback to trigger a data refresh
 * @property {(bed: BedWithElapsedTime) => void} [onBedClick] - Callback for bed click
 * @property {(bedId: string, stageId: string) => void} [onStageSelect] - Callback for updating a bed stage
 * @property {(bedId: string, reason: DispositionDelayReason) => void} [onReasonSelect] - Callback for handling delay reasons
 * @property {(bedId: string, bedNumber: string) => void} [onViewHistory] - Callback to view bed history
 * @property {string | null} [updatingBedId] - ID of bed currently being updated
 * @property {string | null} [updatingStageId] - ID of stage currently being applied
 * @property {string | null} [lastUpdatedBedId] - ID of last successfully updated bed (for highlighting)
 * @property {string | null} [lastUpdatedStageId] - ID of last successfully updated stage
 * @property {Record<string, string>} [errorByBedId] - Map of error messages by bed ID
 * @property {boolean} [isRefreshing] - Loading state for refresh operation
 */
interface BedGridProps {
  data: BedGridData
  onRefresh?: () => void
  onBedClick?: (bed: BedWithElapsedTime) => void
  onStageSelect?: (bedId: string, stageId: string) => void
  onReasonSelect?: (bedId: string, reason: DispositionDelayReason) => void
  onViewHistory?: (bedId: string, bedNumber: string) => void
  updatingBedId?: string | null
  updatingStageId?: string | null
  lastUpdatedBedId?: string | null
  lastUpdatedStageId?: string | null
  errorByBedId?: Record<string, string>
  isRefreshing?: boolean
}

/**
 * Main Bed Grid Display Logic
 * 
 * Renders the grid of beds, handles filtering, context menus, and interactions.
 * This component is central to the dashboard view.
 * 
 * @param {BedGridProps} props - Component props
 * @returns {JSX.Element} The rendered bed grid
 */
export function BedGrid({
  data,
  onRefresh,
  onBedClick,
  onStageSelect,
  onReasonSelect,
  onViewHistory,
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

  const displayedBeds = useMemo(
    () => showDelayedOnly ? data.beds.filter(bed => bed.isDelayed) : data.beds,
    [data.beds, showDelayedOnly]
  )
  const stats = useMemo(() => getBedStatistics(data.beds), [data.beds])

  const toggleFilter = useCallback(() => {
    setShowDelayedOnly(prev => !prev)
  }, [])

  const openMenuForBed = useCallback(async (bedId: string, position: { x: number; y: number }) => {
    setMenuState({ bedId, position })
    setIsLoadingTransitions(true)
    try {
      const result = await getValidTransitionsForBed(bedId)
      if (result.success) {
        setValidNextStages(result.allowed || [])
        setOverrideRequiredStages(result.requiresOverride || [])
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
  }, [])

  const activeBed = useMemo(() => {
    if (!menuState) {
      return null
    }
    return data.beds.find((bed) => bed.id === menuState.bedId) ?? null
  }, [data.beds, menuState])

  return (
    <div className="space-y-6">
      <BedGridToolbar
        showDelayedOnly={showDelayedOnly}
        toggleFilter={toggleFilter}
        delayedCount={stats.delayed}
        isRefreshing={isRefreshing}
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
          onStageSelect={onStageSelect}
          onClose={handleCloseMenu}
          onViewHistory={onViewHistory}
        />
      )}

      <div className="text-center text-xs text-zinc-500">
        Showing {displayedBeds.length} of {data.beds.length} beds
        {showDelayedOnly && ' (delayed only)'}
      </div>
    </div>
  )
}
