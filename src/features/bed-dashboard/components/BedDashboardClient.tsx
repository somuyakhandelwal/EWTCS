'use client'
// US-16.1 – US-16.4: Offline & Network Failure Mode (cache, optimistic UI, sync, conflicts)

import { useCallback, useState, useTransition } from 'react'
import { MapPin } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Tooltip } from '@/shared/components/ui/tooltip'
import { BedGrid } from './BedGrid'
import { ConnectionStatus } from './ConnectionStatus'
import { OfflineBanner } from './OfflineBanner'
import { DashboardSettings } from './DashboardSettings'
import { BedDashboardModals } from './BedDashboardModals'
import { SyncStatusBanner } from './SyncStatusBanner'
import { SyncConflictModal } from './SyncConflictModal'
import { useSyncConflictHandler } from '../hooks/useSyncConflictHandler'
import type { BedGridData, DispositionDelayReason } from '../types/bed'
import { useRealtimeBedUpdates } from '../hooks/useRealtimeBedUpdates'
import { useBedStageUpdate } from '../hooks/useBedStageUpdate'
import { useUndoManager } from '../hooks/useUndoManager'
import { useOfflineQueue } from '../hooks/useOfflineQueue'
import { useOfflineWriteInterceptor } from '../hooks/useOfflineWriteInterceptor'
import { useOfflineOptimisticStages } from '../hooks/useOfflineOptimisticStages'
import { useTatSummary } from '../hooks/useTatSummary'
import { recordDispositionDelayReason } from '../actions/disposition-actions'

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
    isOffline,
    cacheTimestamp,
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
    handleStageSelect: originalHandleStageSelect,
    handleOverrideApprove: originalHandleOverrideApprove,
    closeOverrideModal,
    confirmationState,
    handleConfirmationConfirm: originalHandleConfirmationConfirm,
    closeConfirmationModal,
    settings,
    toggleConfirmation,
    dischargeState,
    isDischargeSubmitting,
    handleDischargeConfirm: originalHandleDischargeConfirm,
    closeDischargeModal,
    triageState,
    openTriageModal,
    closeTriageModal,
    handleTriageSubmit,
  } = useBedStageUpdate(realtimeData)
  const offlineQueue = useOfflineQueue()
  const [, startTransition] = useTransition()
  const baseHandleReasonSelect = useCallback(
    async (bedId: string, reason: DispositionDelayReason) => {
      await recordDispositionDelayReason({ bedId, reason })
      startTransition(() => { handleRefresh() })
    }, [handleRefresh])

  const { syncResult, syncConflicts, isApplyingConflict,
    handleSyncComplete, handleKeepServer, handleForceApply, clearConflicts } = useSyncConflictHandler({ data })

  const {
    handleStageSelect,
    handleOverrideApprove,
    handleConfirmationConfirm,
    handleDischargeConfirm,
    handleReasonSelect,
    onCreateVirtualBed: handleCreateVirtualBed,
    retryDrain,
  } = useOfflineWriteInterceptor({
    isOffline,
    offlineQueue,
    realtimeRefresh,
    originalHandleStageSelect,
    originalHandleOverrideApprove,
    originalHandleConfirmationConfirm,
    originalHandleDischargeConfirm,
    originalHandleReasonSelect: baseHandleReasonSelect,
    originalOnCreateVirtualBed: onCreateVirtualBed,
    overrideState,
    confirmationState,
    dischargeState,
    closeOverrideModal,
    closeConfirmationModal,
    closeDischargeModal,
    onSyncComplete: handleSyncComplete,
  })

  const { handleStageSelectOptimistic, displayData } = useOfflineOptimisticStages({
    data,
    isOffline,
    pendingCount: offlineQueue.pendingCount,
    handleStageSelect,
  })
  const { undoState, undoError, handleUndo, isUndoing } = useUndoManager(
    lastUpdatedBedId, lastUpdatedStageId, realtimeRefresh, isOffline
  )

  const tatSummary = useTatSummary(24)
  const [virtualBedModalOpen, setVirtualBedModalOpen] = useState(false)

  return (
    <div className="space-y-4">
      <OfflineBanner
        isOffline={isOffline}
        pendingCount={offlineQueue.pendingCount}
        isDraining={offlineQueue.isDraining}
        cacheTimestamp={cacheTimestamp}
      />
      {!isOffline && (
        <SyncStatusBanner isDraining={offlineQueue.isDraining} pendingCount={offlineQueue.pendingCount} syncResult={syncResult} onRetry={retryDrain} />
      )}

      {/* Action Bar (Virtual Bed / Settings / Connection) */}
      <div className="flex justify-end items-center gap-2" data-help-id="dashboard-actions">
        <Tooltip content="Create temporary virtual bed" side="left">
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
        </Tooltip>
        <DashboardSettings enabled={settings.confirmCriticalStages} onToggle={toggleConfirmation} />
        <ConnectionStatus status={connectionStatus} onReconnect={reconnect} />
      </div>

      <div data-help-id="dashboard-grid">
        <BedGrid
          data={displayData}
          onRefresh={handleRefresh}
          onStageSelect={handleStageSelectOptimistic}
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
          isOffline={isOffline}
          queuedBedIds={offlineQueue.queuedBedIds}
          onOpenTriage={(bedId) => { const bed = data.beds.find(b => b.id === bedId); const triageStage = data.stages.find(s => s.name === 'Triage'); if (bed && triageStage) { openTriageModal(bed, triageStage);}}}
        />
      </div>
      {undoError && (
        <div className="text-center text-xs text-red-500 font-semibold mt-2">{undoError}</div>
      )}

      <BedDashboardModals
        overrideState={overrideState} isOverrideSubmitting={isOverrideSubmitting} onOverrideApprove={handleOverrideApprove} onOverrideCancel={closeOverrideModal}
        confirmationState={confirmationState} updatingBedId={updatingBedId} onConfirmationConfirm={handleConfirmationConfirm} onConfirmationCancel={closeConfirmationModal}
        dischargeState={dischargeState} isDischargeSubmitting={isDischargeSubmitting} onDischargeConfirm={handleDischargeConfirm} onDischargeCancel={closeDischargeModal}
        virtualBedModalOpen={virtualBedModalOpen} onVirtualBedClose={() => setVirtualBedModalOpen(false)} onVirtualBedCreated={() => { setVirtualBedModalOpen(false); handleRefresh() }} onVirtualBedSubmit={handleCreateVirtualBed}        triageState={triageState}
        onTriageClose={closeTriageModal}
        onTriageSubmit={handleTriageSubmit}      />
      <SyncConflictModal conflicts={syncConflicts} isOpen={syncConflicts.length > 0}
        isApplying={isApplyingConflict} onKeepServer={handleKeepServer}
        onForceApply={handleForceApply} onClose={clearConflicts} />
    </div>
  )
}