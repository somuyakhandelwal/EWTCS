import { SupervisorOverrideModal } from './SupervisorOverrideModal'
import { ConfirmationModal } from './ConfirmationModal'
import { DischargeModal } from './DischargeModal'
import { BedHistoryModal } from './BedHistoryModal'
import type { BedHistoryLog } from '../lib/bed-queries'
import type { OverrideState, ConfirmationState, DischargeState } from '../types/bed'

interface HistoryState {
    isOpen: boolean
    isLoading: boolean
    history: BedHistoryLog[]
    selectedBedNumber: string | null
}

interface DashboardModalsProps {
    overrideState: OverrideState | null
    confirmationState: ConfirmationState | null
    dischargeState: DischargeState | null
    historyState: HistoryState
    handlers: {
        handleOverrideApprove: (reason: string) => Promise<void>
        closeOverrideModal: () => void
        handleConfirmationConfirm: () => Promise<void>
        closeConfirmationModal: () => void
        handleDischargeConfirm: () => Promise<void>
        closeDischargeModal: () => void
        closeHistory: () => void
        refreshHistory: () => void
        isOverrideSubmitting: boolean
        isDischargeSubmitting: boolean
        updatingBedId: string | null
        userRole: string | undefined
    }
}

/**
 * DashboardModals Component
 * 
 * Aggregates all modal interactions for the dashboard to keep the main
 * layout component clean and focused on grid rendering.
 * 
 * Modals Managed:
 * 1. Supervisor Override (for restricted transitions)
 * 2. Critical Stage Confirmation (Discharge, Code, Deceased)
 * 3. Discharge Details Form (when Discharging)
 * 4. Bed History View (Audit trail)
 */
export function DashboardModals({
    overrideState,
    confirmationState,
    dischargeState,
    historyState,
    handlers
}: DashboardModalsProps) {
    const {
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
    } = handlers

    return (
        <>
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

            <BedHistoryModal
                isOpen={historyState.isOpen}
                onClose={closeHistory}
                bedNumber={historyState.selectedBedNumber}
                history={historyState.history}
                isLoading={historyState.isLoading}
                canEdit={userRole === 'supervisor' || userRole === 'admin'}
                onHistoryUpdate={refreshHistory}
            />
        </>
    )
}
