// Bed Dashboard Client Wrapper
// Epic 1: Nurse Desk Bed Dashboard
// US-1.2: Real-time updates with intelligent polling

'use client'

import { useCallback, useTransition, useRef, useState, useEffect } from 'react'
import { BedGrid } from './BedGrid'
import { ConnectionStatus } from './ConnectionStatus'
import { SupervisorOverrideModal } from './SupervisorOverrideModal'
import { ConfirmationModal } from './ConfirmationModal'
import { DischargeModal } from './DischargeModal'
import { DashboardSettings } from './DashboardSettings'
import type { BedGridData, BedWithElapsedTime, DispositionDelayReason } from '../types/bed'
import { useRealtimeBedUpdates } from '../hooks/useRealtimeBedUpdates'
import { useBedStageUpdate } from '../hooks/useBedStageUpdate'
import { recordDispositionDelayReason } from '../actions/disposition-actions'

interface BedDashboardClientProps {
  initialData: BedGridData
}

export function BedDashboardClient({ initialData }: BedDashboardClientProps) {
  // Undo state: which bed can be undone, timer, and previous stage info
  const [undoState, setUndoState] = useState<{
    bedId: string;
    prevStageId: string;
    timer: number;
  } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Watch for stage update to enable Undo
  useEffect(() => {
    if (lastUpdatedBedId && lastUpdatedStageId) {
      setUndoState({ bedId: lastUpdatedBedId, prevStageId: lastUpdatedStageId, timer: 30 });
      if (undoTimerRef.current) clearInterval(undoTimerRef.current);
      undoTimerRef.current = setInterval(() => {
        setUndoState(prev => {
          if (!prev) return null;
          if (prev.timer <= 1) {
            clearInterval(undoTimerRef.current!);
            return null;
          }
          return { ...prev, timer: prev.timer - 1 };
        });
      }, 1000);
    }
    // Cleanup timer if bed changes
    return () => {
      if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    };
  }, [lastUpdatedBedId, lastUpdatedStageId]);

  // Undo handler (to be implemented: call API, refresh, etc.)
  const [undoError, setUndoError] = useState<string | null>(null);
  const handleUndo = useCallback(async () => {
    if (!undoState) return;
    setUndoError(null);
    try {
      const res = await fetch('/src/features/bed-dashboard/api/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedId: undoState.bedId, prevStageId: undoState.prevStageId }),
      });
      const data = await res.json();
      if (!data.success) {
        setUndoError(data.error || 'Undo failed');
      }
    } catch (e) {
      setUndoError('Undo failed');
    }
    setUndoState(null);
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    await handleRefresh();
  }, [undoState, handleRefresh]);

  const handleBedClick = useCallback((bed: BedWithElapsedTime) => {
    void bed
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
      <div className="flex justify-end items-center gap-2">
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
        onReasonSelect={handleReasonSelect}
        updatingBedId={updatingBedId}
        updatingStageId={updatingStageId}
        lastUpdatedBedId={lastUpdatedBedId}
        lastUpdatedStageId={lastUpdatedStageId}
        errorByBedId={errorByBedId}
        isRefreshing={isLoading}
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
    </div>
  )
}
