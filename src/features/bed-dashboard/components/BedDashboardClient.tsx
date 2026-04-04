'use client'
// US-16.1 – US-16.4: Offline & Network Failure Mode (cache, optimistic UI, sync, conflicts)
// EPIC 22: Doctor Diagnosis Modal integration
// DB5-02: Dashboard & filter preferences now loaded SSR — no flash of default state

import { useCallback, useState, useTransition } from 'react'
import { BedGrid } from './BedGrid'
import { OfflineBanner } from './OfflineBanner'
import { BedDashboardActionBar } from './BedDashboardActionBar'
import { BedDashboardModals } from './BedDashboardModals'
import { SyncStatusBanner } from './SyncStatusBanner'
import { useSyncConflictHandler } from '../hooks/useSyncConflictHandler'
import type { BedGridData, DispositionDelayReason } from '../types/bed'
import type { DiagnosisState } from '@/shared/types/diagnosis.types'
import { useRealtimeBedUpdates } from '../hooks/useRealtimeBedUpdates'
import { useBedStageUpdate } from '../hooks/useBedStageUpdate'
import { useDashboardSettings } from '../hooks/useDashboardSettings'
import { useBedFilter } from '../hooks/useBedFilter'
import { useUndoManager } from '../hooks/useUndoManager'
import { useOfflineQueue } from '../hooks/useOfflineQueue'
import { useOfflineWriteInterceptor } from '../hooks/useOfflineWriteInterceptor'
import { useOfflineOptimisticStages } from '../hooks/useOfflineOptimisticStages'
import { useTatSummary } from '../hooks/useTatSummary'
import { recordDispositionDelayReason } from '../actions/disposition-actions'
import type { UserPreferences } from '@/shared/types/user-preferences.types'
import { DEFAULT_USER_PREFERENCES } from '@/shared/types/user-preferences.types'

interface BedDashboardClientProps {
  initialData: BedGridData
  canRecordDispositionReasons?: boolean
  /** Server action for creating virtual beds — injected from app layer (no cross-feature import) */
  onCreateVirtualBed: (fd: FormData) => Promise<{ success: boolean; error?: string }>
  /** Current user role — forwarded to BedCard for EPIC 22 doctor button */
  role?: string
  /**
   * DB5-02: SSR-fetched user preferences — eliminates flash of default state.
   * Falls back to DEFAULT_USER_PREFERENCES when not provided.
   */
  initialPreferences?: UserPreferences
}

export function BedDashboardClient({
  initialData,
  canRecordDispositionReasons = true,
  onCreateVirtualBed,
  role,
  initialPreferences = DEFAULT_USER_PREFERENCES,
}: BedDashboardClientProps) {
  // DB5-02: Settings & filter are owned here now (SSR initial values)
  const { settings, toggleConfirmation } = useDashboardSettings(
    initialPreferences.confirmCriticalStages
  )

  const {
    data: realtimeData,
    connectionStatus,
    isLoading,
    reconnect,
    refresh: realtimeRefresh,
    isOffline,
    cacheTimestamp,
  } = useRealtimeBedUpdates(initialData)
  const isEffectivelyOffline = isOffline || connectionStatus.status === 'disconnected'

  const {
    data, updatingBedId, updatingStageId, lastUpdatedBedId, lastUpdatedStageId, errorByBedId,
    isOverrideSubmitting, overrideState, handleRefresh, handleStageSelect: originalHandleStageSelect,
    handleOverrideApprove: originalHandleOverrideApprove, closeOverrideModal, confirmationState,
    handleConfirmationConfirm: originalHandleConfirmationConfirm, closeConfirmationModal,
    dischargeState, isDischargeSubmitting, handleDischargeConfirm: originalHandleDischargeConfirm,
    closeDischargeModal, triageState, openTriageModal, closeTriageModal, handleTriageSubmit,
  } = useBedStageUpdate(realtimeData, { confirmCriticalStages: settings.confirmCriticalStages })
  
  const offlineQueue = useOfflineQueue()
  const [, startTransition] = useTransition()
  
  const baseHandleReasonSelect = useCallback(
    async (bedId: string, reason: DispositionDelayReason) => {
      await recordDispositionDelayReason({ bedId, reason })
      startTransition(() => { handleRefresh() })
    }, [handleRefresh])

  const { syncResult, syncConflicts, isApplyingConflict, handleSyncComplete, handleKeepServer, handleForceApply, clearConflicts } = useSyncConflictHandler({ data })

  const {
    handleStageSelect,
    handleOverrideApprove,
    handleConfirmationConfirm,
    handleDischargeConfirm,
    handleReasonSelect,
    onCreateVirtualBed: handleCreateVirtualBed,
    retryDrain,
  } = useOfflineWriteInterceptor({
    isOffline: isEffectivelyOffline,
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
    isOffline: isEffectivelyOffline,
    pendingCount: offlineQueue.pendingCount,
    handleStageSelect,
  })
  const {
    showDelayedOnly,
    sortOrder,
    searchQuery,
    displayedBeds: filteredBeds,
    isFilterActive,
    toggleDelayedFilter,
    toggleSortOrder,
    setSearchQuery,
    clearFilter,
  } = useBedFilter(displayData.beds, {
    showDelayedOnly: initialPreferences.showDelayedOnly,
    sortOrder: initialPreferences.sortOrder,
  })
  const { undoState, undoError, handleUndo, isUndoing } = useUndoManager(
    lastUpdatedBedId, lastUpdatedStageId, realtimeRefresh, isEffectivelyOffline
  )
  const tatSummary = useTatSummary(24)
  const [virtualBedModalOpen, setVirtualBedModalOpen] = useState(false)
  const [diagnosisState, setDiagnosisState] = useState<DiagnosisState | null>(null)
  const openDiagnosisModal = (bedId: string, bedNumber: string, patientUhid: string, keySymptom?: string | null) => {
    setDiagnosisState({ bedId, bedNumber, patientUhid, keySymptom })
  }
  const closeDiagnosisModal = () => setDiagnosisState(null)
  const displayedBeds = filteredBeds
  return (
    <div className="space-y-4">
      <OfflineBanner
        isOffline={isEffectivelyOffline}
        pendingCount={offlineQueue.pendingCount}
        isDraining={offlineQueue.isDraining}
        cacheTimestamp={cacheTimestamp}
      />
      {!isEffectivelyOffline && (
        <SyncStatusBanner isDraining={offlineQueue.isDraining} pendingCount={offlineQueue.pendingCount} syncResult={syncResult} onRetry={retryDrain} />
      )}
      <BedDashboardActionBar
        onAddVirtualBed={() => setVirtualBedModalOpen(true)}
        confirmCriticalStages={settings.confirmCriticalStages}
        onToggleConfirmation={toggleConfirmation}
        connectionStatus={connectionStatus}
        onReconnect={reconnect}
      />
      <div data-help-id="dashboard-grid">
        <BedGrid
          data={displayData} onRefresh={handleRefresh} onStageSelect={handleStageSelectOptimistic} onReasonSelect={canRecordDispositionReasons ? handleReasonSelect : undefined}
          tatSummary={tatSummary} updatingBedId={updatingBedId} updatingStageId={updatingStageId} lastUpdatedBedId={lastUpdatedBedId} lastUpdatedStageId={lastUpdatedStageId}
          errorByBedId={errorByBedId} isRefreshing={isLoading} undoState={undoState} onUndo={handleUndo} isUndoing={isUndoing} isOffline={isEffectivelyOffline} queuedBedIds={offlineQueue.queuedBedIds}
          onOpenTriage={(bedId) => { const bed = data.beds.find(b => b.id === bedId); const triageStage = data.stages.find(s => s.name === 'Triage'); if (bed && triageStage) openTriageModal(bed, triageStage); }}
          onOpenDiagnosis={(bedId) => { const bed = data.beds.find((b) => b.id === bedId); if (bed) openDiagnosisModal(bed.id, bed.bedNumber, bed.metadata?.triageInfo?.patientUhid ?? '', bed.metadata?.triageInfo?.keySymptom ?? null) }}
          role={role} showDelayedOnly={showDelayedOnly} sortOrder={sortOrder} searchQuery={searchQuery} displayedBeds={displayedBeds} isFilterActive={isFilterActive}
          onToggleDelayedFilter={toggleDelayedFilter} onToggleSortOrder={toggleSortOrder} onSearchChange={setSearchQuery} onClearFilter={clearFilter}
        />
      </div>
      {undoError && <div className="text-center text-xs text-red-500 font-semibold mt-2">{undoError}</div>}
      <BedDashboardModals
        overrideState={overrideState} isOverrideSubmitting={isOverrideSubmitting} onOverrideApprove={handleOverrideApprove} onOverrideCancel={closeOverrideModal}
        confirmationState={confirmationState} updatingBedId={updatingBedId} onConfirmationConfirm={handleConfirmationConfirm} onConfirmationCancel={closeConfirmationModal}
        dischargeState={dischargeState} isDischargeSubmitting={isDischargeSubmitting} onDischargeConfirm={handleDischargeConfirm} onDischargeCancel={closeDischargeModal}
        virtualBedModalOpen={virtualBedModalOpen} onVirtualBedClose={() => setVirtualBedModalOpen(false)} onVirtualBedCreated={() => { setVirtualBedModalOpen(false); handleRefresh() }} onVirtualBedSubmit={handleCreateVirtualBed}
        triageState={triageState} onTriageClose={closeTriageModal} onTriageSubmit={handleTriageSubmit}
        diagnosisState={diagnosisState} onDiagnosisClose={closeDiagnosisModal} onDiagnosisSuccess={handleRefresh}
        syncConflicts={syncConflicts} isApplyingConflict={isApplyingConflict} onKeepServer={handleKeepServer} onForceApply={handleForceApply} onClearConflicts={clearConflicts}
      />
    </div>
  )
}