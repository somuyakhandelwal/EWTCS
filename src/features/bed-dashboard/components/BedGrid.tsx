'use client'

import { useMemo } from 'react'
import { BedCard } from './BedCard'
import { BedStatusLegend } from './BedStatusLegend'
import { BedStageContextMenu } from './BedStageContextMenu'
import { BottleneckPanel } from './BottleneckPanel'
import { BedGridStats } from './BedGridStats'
import { BedGridHeader } from './BedGridHeader'
import { BedGridFooter } from './BedGridFooter'
import { useBedContextMenu } from '../hooks/useBedContextMenu'
import type { BedGridData, BedWithElapsedTime, DispositionDelayReason, TatSummary } from '../types/bed'
import type { SortOrder } from '../hooks/useBedFilter'
import { getBedStatistics } from '../lib/utils'
import { isCleaningStage } from './CleaningActions'

interface BedGridProps {
  data: BedGridData
  onRefresh?: () => void
  onBedClick?: (bed: BedWithElapsedTime) => void
  onStageSelect?: (bedId: string, stageId: string) => void
  onReasonSelect?: (bedId: string, reason: DispositionDelayReason) => void
  tatSummary?: TatSummary | null
  updatingBedId?: string | null
  updatingStageId?: string | null
  lastUpdatedBedId?: string | null
  lastUpdatedStageId?: string | null
  errorByBedId?: Record<string, string>
  isRefreshing?: boolean
  undoState?: { bedId: string; timer: number } | null
  onUndo?: () => void
  /** True while the undo API call is in-flight */
  isUndoing?: boolean
  /** US-16.2: true when browser is offline — enables cached transition map in context menu */
  isOffline?: boolean
  /** US-16.2: beds that have a write queued for sync — shown with an amber badge */
  queuedBedIds?: Set<string>
  /** EPIC 22: open diagnosis modal for a bed (doctor role) */
  onOpenDiagnosis?: (bedId: string) => void
  /** Current user role — forwarded to BedCard for EPIC 22 */
  role?: string
  // DB5-02: Filter state lifted to BedDashboardClient for SSR initial values
  showDelayedOnly: boolean
  sortOrder: SortOrder
  searchQuery: string
  displayedBeds: BedWithElapsedTime[]
  isFilterActive: boolean
  onToggleDelayedFilter: () => void
  onToggleSortOrder: () => void
  onSearchChange: (query: string) => void
  onClearFilter: () => void
}

export function BedGrid({
  data,
  onRefresh,
  onBedClick,
  onStageSelect,
  onReasonSelect,
  tatSummary = null,
  updatingBedId = null,
  updatingStageId = null,
  lastUpdatedBedId = null,
  lastUpdatedStageId = null,
  errorByBedId = {},
  isRefreshing = false,
  undoState,
  onUndo,
  isUndoing = false,
  isOffline = false,
  queuedBedIds,
  onOpenDiagnosis,
  role,
  // DB5-02: filter state from BedDashboardClient
  showDelayedOnly,
  sortOrder,
  searchQuery,
  displayedBeds,
  isFilterActive,
  onToggleDelayedFilter,
  onToggleSortOrder,
  onSearchChange,
  onClearFilter,
}: BedGridProps) {
  const {
    menuState,
    validNextStages,
    overrideRequiredStages,
    isLoadingTransitions,
    menuError,
    activeBed,
    handleOpenMenu,
    handleBedTap,
    handleCloseMenu,
  } = useBedContextMenu(data.beds, onStageSelect, isOffline, data.stageTransitionMap)

  const stats = useMemo(() => getBedStatistics(data.beds), [data.beds])
  const cleaningCount = useMemo(() => data.beds.filter(b => isCleaningStage(b.currentStage?.name)).length, [data.beds])

  return (
    <div className="space-y-6">
      {/* Unified Header with Search, filters and actions */}
      <BedGridHeader
        searchQuery={searchQuery}
        showDelayedOnly={showDelayedOnly}
        sortOrder={sortOrder}
        delayedCount={stats.delayed}
        isFilterActive={isFilterActive}
        isRefreshing={isRefreshing}
        onSearchChange={onSearchChange}
        onToggleFilter={onToggleDelayedFilter}
        onToggleSortOrder={onToggleSortOrder}
        onClearFilter={onClearFilter}
        onRefresh={onRefresh}
      />

      {/* Statistics bar */}
      <BedGridStats
        total={stats.total}
        occupied={stats.occupied}
        available={stats.available}
        delayed={stats.delayed}
        bottleneckCount={data.bottleneckCount}
        escalationCount={data.escalationCount}
        cleaningCount={cleaningCount}
        avgTatMs={tatSummary?.averageTatMs}
      />

      {/* Legend */}
      <BedStatusLegend
        stages={data.stages}
        delayThresholdMs={data.delayThresholdMs}
        escalationThresholdMs={data.escalationThresholdMs}
      />

      {/* US-1.6: Disposition bottleneck panel */}
      <BottleneckPanel beds={data.beds} onReasonRecorded={onRefresh} />

      {/* Bed Grid */}
      {displayedBeds.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
          <p className="text-muted-foreground">
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
              isUndoing={undoState?.bedId === bed.id ? isUndoing : false}
              isOffline={isOffline}
              isQueuedOffline={queuedBedIds?.has(bed.id) ?? false}
              onOpenDiagnosis={onOpenDiagnosis}
              role={role}
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
          isLoadingTransitions={isLoadingTransitions}
          isMutating={Boolean(updatingBedId)}
          updatingStageId={updatingStageId}
          isOffline={isOffline}
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
