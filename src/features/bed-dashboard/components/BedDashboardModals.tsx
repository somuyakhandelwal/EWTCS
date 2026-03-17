'use client'
// Extracted from BedDashboardClient to keep it within the 200-line budget.
// Renders all four modals: SupervisorOverride, Confirmation, Discharge, AddVirtualBed.

import { SupervisorOverrideModal } from './SupervisorOverrideModal'
import { ConfirmationModal } from './ConfirmationModal'
import { DischargeModal } from './DischargeModal'
import { AddVirtualBedModal } from './AddVirtualBedModal'
import { TriageModal } from './TriageModal'
import type { OverrideState, ConfirmationState, DischargeState } from '../types/bed'
import type { TriageState } from '../hooks/useBedStageUpdate'

interface BedDashboardModalsProps {
  // SupervisorOverrideModal
  overrideState: OverrideState | null
  isOverrideSubmitting: boolean
  onOverrideApprove: (reason: string) => Promise<void>
  onOverrideCancel: () => void
  // ConfirmationModal
  confirmationState: ConfirmationState | null
  updatingBedId: string | null
  onConfirmationConfirm: () => Promise<void>
  onConfirmationCancel: () => void
  // DischargeModal
  dischargeState: DischargeState | null
  isDischargeSubmitting: boolean
  onDischargeConfirm: () => Promise<void>
  onDischargeCancel: () => void
  // AddVirtualBedModal
  virtualBedModalOpen: boolean
  onVirtualBedClose: () => void
  onVirtualBedCreated: () => void
  onVirtualBedSubmit: (fd: FormData) => Promise<{ success: boolean; error?: string }>
  // US-20.2: Triage Modal
  triageState?: TriageState | null
  onTriageClose?: () => void
  onTriageSubmit?: (bedId: string, triageData: {
    patientUhid: string;
    patientName: string;
    keySymptom: string;
    triageCategory: 'Resuscitation' | 'Emergent' | 'Urgent' | 'Less Urgent' | 'Non-Urgent';
  }) => Promise<void>
}

export function BedDashboardModals({
  overrideState,
  isOverrideSubmitting,
  onOverrideApprove,
  onOverrideCancel,
  confirmationState,
  updatingBedId,
  onConfirmationConfirm,
  onConfirmationCancel,
  dischargeState,
  isDischargeSubmitting,
  onDischargeConfirm,
  onDischargeCancel,
  virtualBedModalOpen,
  onVirtualBedClose,
  onVirtualBedCreated,
  onVirtualBedSubmit,
  triageState,
  onTriageClose,
  onTriageSubmit,
}: BedDashboardModalsProps) {
  return (
    <>
      {triageState && onTriageClose && onTriageSubmit && (
        <TriageModal
          bed={triageState.bed}
          isOpen={Boolean(triageState)}
          onClose={onTriageClose}
          onSubmit={onTriageSubmit}
        />
      )}
      <SupervisorOverrideModal
        isOpen={Boolean(overrideState)}
        bedNumber={overrideState?.bedNumber ?? null}
        fromStageName={overrideState?.fromStageName ?? null}
        toStage={overrideState?.toStage ?? null}
        reason={overrideState?.reason ?? null}
        onApprove={onOverrideApprove}
        onCancel={onOverrideCancel}
        isLoading={isOverrideSubmitting}
      />
      <ConfirmationModal
        isOpen={Boolean(confirmationState)}
        bedNumber={confirmationState?.bedNumber ?? null}
        fromStageName={confirmationState?.fromStageName ?? null}
        toStage={confirmationState?.toStage ?? null}
        onConfirm={onConfirmationConfirm}
        onCancel={onConfirmationCancel}
        isUpdating={confirmationState ? updatingBedId === confirmationState.bedId : false}
      />
      <DischargeModal
        isOpen={Boolean(dischargeState)}
        dischargeState={dischargeState}
        onConfirm={onDischargeConfirm}
        onCancel={onDischargeCancel}
        isSubmitting={isDischargeSubmitting}
      />
      <AddVirtualBedModal
        open={virtualBedModalOpen}
        onClose={onVirtualBedClose}
        onCreated={onVirtualBedCreated}
        onSubmit={onVirtualBedSubmit}
      />
    </>
  )
}
