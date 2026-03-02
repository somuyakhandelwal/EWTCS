'use client'

import { useCallback, useState, useEffect, useTransition } from 'react'
import { MapPin } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { BedGrid } from './BedGrid'
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
    refresh: realtimeRefresh,
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

  // Use realtimeRefresh (calls getBedGridData directly, updates displayed grid state)
  // NOT handleRefresh (router.refresh) — router.refresh only re-renders the server component
  // but cannot update useBedStageUpdate's isolated useState after mount.
  const { undoState, undoError, handleUndo, isUndoing } = useUndoManager(lastUpdatedBedId, lastUpdatedStageId, realtimeRefresh)

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
      {/* Action Bar (Virtual Bed / Settings / Connection) */}
      <div className="flex justify-end items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVirtualBedModalOpen(true)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border-status-virtual/30 bg-status-virtual/5 text-status-virtual hover:bg-status-virtual/10 transition-colors font-semibold"
          title="Add virtual (hallway/stretcher) bed"
          aria-label="Add virtual hallway or stretcher bed"
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-xs font-medium">Add Virtual Bed</span>
        </Button>
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
        undoState={undoState}
        onUndo={handleUndo}
        isUndoing={isUndoing}
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