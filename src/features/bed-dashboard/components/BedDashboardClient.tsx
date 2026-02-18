// Bed Dashboard Client Wrapper
// Epic 1: Nurse Desk Bed Dashboard
// US-1.2: Real-time updates with intelligent polling + Search functionality

'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { BedGrid } from './BedGrid'
import { SearchInput } from './SearchInput'
import { ConnectionStatus } from './ConnectionStatus'
import { SupervisorOverrideModal } from './SupervisorOverrideModal'
import { ConfirmationModal } from './ConfirmationModal'
import { DashboardSettings } from './DashboardSettings'
import type { BedGridData, BedWithElapsedTime } from '../types/bed'
import { useRealtimeBedUpdates } from '../hooks/useRealtimeBedUpdates'
import { useBedStageUpdate } from '../hooks/useBedStageUpdate'

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
    </div>
  )
}
