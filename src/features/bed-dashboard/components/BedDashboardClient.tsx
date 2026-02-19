'use client'

/**
 * BedDashboardClient.tsx
 * 
 * The main client-side entry point for the Bed Dashboard feature.
 * This component orchestrates the real-time data flow, user interactions,
 * and state management for the entire bed grid view.
 * 
 * Key Responsibilities:
 * 1. Data Fetching: Initializes with server data and subscribes to real-time updates.
 * 2. Stage Management: Handles transitions, including validation and optimistic updates.
 * 3. Modal Coordination: Manages visibility for Confirmations, Overrides, Discharge, and History modals.
 * 4. Error Handling: Displays connection status and operation errors.
 * 
 * Hooks Used:
 * - useRealtimeBedUpdates: For live WebSocket/polling data.
 * - useBedStageUpdate: For mutation logic and state (optimistic UI).
 * - useBedHistory: For fetching and managing the history log state.
 * 
 * @module BedDashboard
 */

import { useCallback, useTransition } from 'react'
import { BedGrid } from './BedGrid'
import type { BedGridData, BedWithElapsedTime, DispositionDelayReason } from '../types/bed'
import { useRealtimeBedUpdates } from '../hooks/useRealtimeBedUpdates'
import { useBedStageUpdate } from '../hooks/useBedStageUpdate'
import { recordDispositionDelayReason } from '../actions/disposition-actions'
import { useBedHistory } from '../hooks/useBedHistory'
import { DashboardHeader } from './DashboardHeader'
import { DashboardModals } from './DashboardModals'

interface BedDashboardClientProps {
  initialData: BedGridData
  userRole?: string
}

export function BedDashboardClient({ initialData, userRole }: BedDashboardClientProps) {
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
  } = useBedStageUpdate(realtimeData)

  const {
    isOpen: isHistoryOpen,
    isLoading: isHistoryLoading,
    history,
    selectedBedNumber,
    fetchHistory,
    closeHistory,
    refreshHistory
  } = useBedHistory()

  const handleBedClick = useCallback((bed: BedWithElapsedTime) => {
    // Placeholder for future detail view navigation
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

  // Aggregate handlers for the modal subcomponent
  const modalHandlers = {
    handleOverrideApprove,
    closeOverrideModal,
    handleConfirmationConfirm,
    closeConfirmationModal,
    handleDischargeConfirm,
    closeDischargeModal,
    closeHistory,
    refreshHistory,
    isOverrideSubmitting,
    isDischargeSubmitting,
    updatingBedId,
    userRole
  }

  // Aggregate history state
  const historyState = {
    isOpen: isHistoryOpen,
    isLoading: isHistoryLoading,
    history,
    selectedBedNumber
  }

  return (
    <div className="space-y-4">
      <DashboardHeader
        settings={settings}
        toggleConfirmation={toggleConfirmation}
        connectionStatus={connectionStatus}
        reconnect={reconnect}
      />

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
        onViewHistory={fetchHistory}
      />

      <DashboardModals
        overrideState={overrideState}
        confirmationState={confirmationState}
        dischargeState={dischargeState}
        historyState={historyState}
        handlers={modalHandlers}
      />
    </div>
  )
}
