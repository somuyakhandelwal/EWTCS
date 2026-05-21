'use client'
// Extracted from BedDashboardClient to keep it within the 200-line budget.
// Renders all modals: SupervisorOverride, Confirmation, Discharge, AddVirtualBed, TriageInfo, Diagnosis.
// NOTE (U.S 25.2): TriageModal is used by the TRIAGE WARD dashboard (/triage page) only.
// Triage is a separate physical ward — it is NOT an ER bed stage.

import { SupervisorOverrideModal } from './SupervisorOverrideModal'
import { ConfirmationModal } from './ConfirmationModal'
import { DischargeModal } from './DischargeModal'
import { AddVirtualBedModal } from './AddVirtualBedModal'
import { TriageModal } from './TriageModal'
import { DiagnosisModal } from '@/features/diagnosis/components/DiagnosisModal'
import { SyncConflictModal } from './SyncConflictModal'
import type { SyncConflict } from './SyncConflictModal'
import type { OverrideState, ConfirmationState, DischargeState } from '../types/bed'
import type { TriageState } from '../hooks/useBedStageUpdate'
import type { DiagnosisState } from '@/shared/types/diagnosis.types'

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
  // TriageModal: used by /triage page (TRIAGE WARD beds only — U.S 25.2: NOT an ER stage)
  triageState?: TriageState | null
  onTriageClose?: () => void
  onTriageSubmit?: (bedId: string, triageData: {
    patientUhid: string;
    patientIpdId?: string | null;
    patientName: string;
    patientAge: number;
    patientGender: 'Male' | 'Female' | 'Other' | 'Unknown';
    keySymptom: string;
    triageCategory: 'Resuscitation' | 'Emergent' | 'Urgent' | 'Less Urgent' | 'Non-Urgent';
  }) => Promise<void>
  // EPIC 22: Diagnosis Modal
  diagnosisState?: DiagnosisState | null
  onDiagnosisClose?: () => void
  onDiagnosisSuccess?: () => void
  // SyncConflictModal
  syncConflicts: SyncConflict[]
  isApplyingConflict: boolean
  onKeepServer: (entryId: string) => void
  onForceApply: (entryId: string) => Promise<void>
  onClearConflicts: () => void
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
  diagnosisState,
  onDiagnosisClose,
  onDiagnosisSuccess,
  syncConflicts,
  isApplyingConflict,
  onKeepServer,
  onForceApply,
  onClearConflicts,
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
      <DiagnosisModal
        diagnosisState={diagnosisState ?? null}
        isOpen={Boolean(diagnosisState)}
        onClose={onDiagnosisClose ?? (() => { })}
        onSuccess={onDiagnosisSuccess}
      />
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
      <SyncConflictModal
        conflicts={syncConflicts}
        isOpen={syncConflicts.length > 0}
        isApplying={isApplyingConflict}
        onKeepServer={onKeepServer}
        onForceApply={onForceApply}
        onClose={onClearConflicts}
      />
    </>
  )
}
