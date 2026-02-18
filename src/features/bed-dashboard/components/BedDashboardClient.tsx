// Bed Dashboard Client Wrapper
// Epic 1: Nurse Desk Bed Dashboard
// US-1.2: Real-time updates with intelligent polling

'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { BedGrid } from './BedGrid'
import { SearchInput } from './SearchInput'
import type { BedGridData, BedWithElapsedTime } from '../types/bed'
import { SupervisorOverrideModal } from './SupervisorOverrideModal'
import { ConfirmationModal } from './ConfirmationModal'
import { DashboardSettings } from './DashboardSettings'
import { useBedStageUpdate } from '../hooks/useBedStageUpdate'

interface BedDashboardClientProps {
  initialData: BedGridData
}

export function BedDashboardClient({ initialData }: BedDashboardClientProps) {
  const {
    data,
    updatingBedId,
    updatingStageId,
    errorByBedId,
    lastUpdatedBedId,
    lastUpdatedStageId,
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
  } = useBedStageUpdate(initialData)

  // Search state: immediate input and debounced query used for filtering
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

  // TODO: Implement real-time updates (US-1.2)
  const isLoading = false, connectionStatus = 'connected', reconnect = () => { }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const ConnectionStatus = (_props: { status: string; onReconnect: () => void }) => null

  const handleBedClick = useCallback((bed: BedWithElapsedTime) => {
    // TODO US-1.2: Open bed details modal or navigate to bed page
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

      {/* Bed Grid with real-time data */}
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

