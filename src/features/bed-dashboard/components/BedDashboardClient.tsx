// Bed Dashboard Client Wrapper
// Epic 1: Nurse Desk Bed Dashboard
// US-1.2: Real-time updates with intelligent polling + Search functionality

'use client'

import { useCallback, useState, useRef, useEffect, useTransition } from 'react'
import { MapPin } from 'lucide-react'
import { BedGrid } from './BedGrid'
import { SearchInput } from './SearchInput'
import { ConnectionStatus } from './ConnectionStatus'
import { SupervisorOverrideModal } from './SupervisorOverrideModal'
import { ConfirmationModal } from './ConfirmationModal'
import { DischargeModal } from './DischargeModal'
import { DashboardSettings } from './DashboardSettings'
import { AddVirtualBedModal } from './AddVirtualBedModal'
import type { BedGridData, BedWithElapsedTime, DispositionDelayReason } from '../types/bed'
import { useRealtimeBedUpdates } from '../hooks/useRealtimeBedUpdates'
import { useBedStageUpdate } from '../hooks/useBedStageUpdate'
import { useUndoManager } from '../hooks/useUndoManager'
import { recordDispositionDelayReason } from '../actions/disposition-actions'
import { fetchTatSummary } from '../actions/tat-actions'
import type { TatSummary } from '../types/bed'

interface BedDashboardClientProps {
  initialData: BedGridData
  canRecordDispositionReasons?: boolean
  /** Server action for creating virtual beds — injected from app layer (no cross-feature import) */
  onCreateVirtualBed: (fd: FormData) => Promise<{ success: boolean; error?: string }>
}

export function BedDashboardClient({
  initialData,
  canRecordDispositionReasons = true,
  onCreateVirtualBed,
}: BedDashboardClientProps) {
  const {
    data: realtimeData,
    connectionStatus,
    isLoading,
    reconnect,
  } = useRealtimeBedUpdates(initialData)

  const {
    data,
    updatingBedId,
    updatingStageId,
    lastUpdatedBedId,
    lastUpdatedStageId,
    errorByBedId,
    isOverrideSubmitting,
    overrideState,
    handleRefresh,
    handleStageSelect,
    handleOverrideApprove,
    closeOverrideModal,
    confirmationState,
    handleConfirmationConfirm,
    closeConfirmationModal,
    settings,
    toggleConfirmation,
    // US-2.3
    dischargeState,
    isDischargeSubmitting,
    handleDischargeConfirm,
    closeDischargeModal,
  } = useBedStageUpdate(realtimeData);

  const { undoState, undoError, handleUndo } = useUndoManager(lastUpdatedBedId, lastUpdatedStageId, handleRefresh)

  // Search state: immediate input and debounced query used for filtering (US-1.2)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput.trim())
      searchDebounceRef.current = null
    }, 200)

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
        searchDebounceRef.current = null
      }
    }
  }, [searchInput])

  const handleBedClick = useCallback((bed: BedWithElapsedTime) => {
    void bed
  }, [])

  // US-2.4: TAT summary for the stats bar
  const [tatSummary, setTatSummary] = useState<TatSummary | null>(null)

  // US-6.6: virtual bed modal (nurse can add hallway/stretcher patients)
  const [virtualBedModalOpen, setVirtualBedModalOpen] = useState(false)

  useEffect(() => {
    fetchTatSummary(24)
      .then(r => { if (r.success && r.data) setTatSummary(r.data) })
      .catch(() => { /* TAT is non-critical */ })
  }, [])

  const [, startTransition] = useTransition()

  const handleReasonSelect = useCallback(
    async (bedId: string, reason: DispositionDelayReason) => {
      await recordDispositionDelayReason({ bedId, reason })
      startTransition(() => { handleRefresh() })
    },
    [handleRefresh]
  )

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <SearchInput
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Search by bed number (EW-01) or status (Triage)..."
      />
      {/* Connection Status Indicator */}
      <div className="flex justify-end items-center gap-2">
        <button
          type="button"
          onClick={() => setVirtualBedModalOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-purple-800/50 border border-purple-700/50 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-700/60 transition-colors"
          title="Add virtual (hallway/stretcher) bed"
        >
          <MapPin className="h-3.5 w-3.5" />
          Add Virtual Bed
        </button>
        <DashboardSettings
          enabled={settings.confirmCriticalStages}
          onToggle={toggleConfirmation}
        />
        <ConnectionStatus status={connectionStatus} onReconnect={reconnect} />
      </div>
      <BedGrid
        data={data}
        onRefresh={handleRefresh}
        onBedClick={handleBedClick}
        onStageSelect={handleStageSelect}
        onReasonSelect={canRecordDispositionReasons ? handleReasonSelect : undefined}
        tatSummary={tatSummary}
        updatingBedId={updatingBedId}
        updatingStageId={updatingStageId}
        lastUpdatedBedId={lastUpdatedBedId}
        lastUpdatedStageId={lastUpdatedStageId}
        errorByBedId={errorByBedId}
        isRefreshing={isLoading}
        searchQuery={searchQuery}
        undoState={undoState}
        onUndo={handleUndo}
      />
      {undoError && (
        <div className="text-center text-xs text-red-500 font-semibold mt-2">{undoError}</div>
      )}
      <SupervisorOverrideModal
        isOpen={Boolean(overrideState)}
        bedNumber={overrideState?.bedNumber ?? null}
        fromStageName={overrideState?.fromStageName ?? null}
        toStage={overrideState?.toStage ?? null}
        reason={overrideState?.reason ?? null}
        onApprove={handleOverrideApprove}
        onCancel={closeOverrideModal}
        isLoading={isOverrideSubmitting}
      />
      <ConfirmationModal
        isOpen={Boolean(confirmationState)}
        bedNumber={confirmationState?.bedNumber ?? null}
        fromStageName={confirmationState?.fromStageName ?? null}
        toStage={confirmationState?.toStage ?? null}
        onConfirm={handleConfirmationConfirm}
        onCancel={closeConfirmationModal}
        isUpdating={confirmationState ? updatingBedId === confirmationState.bedId : false}
      />

      {/* US-2.3: Discharge confirmation modal */}
      <DischargeModal
        isOpen={Boolean(dischargeState)}
        dischargeState={dischargeState}
        onConfirm={handleDischargeConfirm}
        onCancel={closeDischargeModal}
        isSubmitting={isDischargeSubmitting}
      />
      {/* US-6.6: Add virtual (hallway/stretcher) bed modal */}
      <AddVirtualBedModal
        open={virtualBedModalOpen}
        onClose={() => setVirtualBedModalOpen(false)}
        onCreated={() => { setVirtualBedModalOpen(false); handleRefresh() }}
        onSubmit={onCreateVirtualBed}
      />
    </div>
  )
}