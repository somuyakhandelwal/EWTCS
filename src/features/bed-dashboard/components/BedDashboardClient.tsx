// Bed Dashboard Client Wrapper
// Epic 1: Nurse Desk Bed Dashboard
// US-1.2: Real-time updates with intelligent polling + Search functionality

'use client'

import { useCallback, useState, useRef, useEffect, useTransition } from 'react'
import { BedGrid } from './BedGrid'
import { SearchInput } from './SearchInput'
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
        searchQuery={searchQuery}
      />

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
