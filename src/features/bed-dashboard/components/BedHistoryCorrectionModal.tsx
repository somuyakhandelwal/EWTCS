'use client'

import { AlertTriangle, X } from 'lucide-react'
import { BedHistoryCorrectionForm } from './BedHistoryCorrectionForm'

/**
 * BedHistoryCorrectionModal Component
 * 
 * This component provides a modal interface for supervisors to correct
 * historical bed stage logs. It ensures that all corrections are documented
 * with a mandatory reason and proper audit tracking.
 * 
 * Features:
 * - Validates input (reason length, non-negative duration)
 * - visual feedback for mandatory fields
 * - Asynchronous submission with loading state
 * - Role-based access (implicitly controlled by parent)
 */

/**
 * Props for the BedHistoryCorrectionModal
 * 
 * @property {boolean} isOpen - Controls visibility of the modal
 * @property {() => void} onClose - Callback to close the modal without saving
 * @property {() => void} onSuccess - Callback triggered after successful correction
 * @property {string | null} logId - The UUID of the log entry being corrected
 * @property {number | null} initialDurationMs - Original duration in previous stage (milliseconds)
 * @property {string | null} initialNotes - Original notes attached to the log
 * @property {string | null} fromStageName - Name of the starting stage
 * @property {string | null} toStageName - Name of the ending stage
 */
interface BedHistoryCorrectionModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    logId: string | null
    initialDurationMs: number | null
    initialNotes: string | null
    fromStageName: string | null
    toStageName: string | null
}

export function BedHistoryCorrectionModal({
    isOpen,
    onClose,
    onSuccess,
    logId,
    initialDurationMs,
    initialNotes,
    fromStageName,
    toStageName
}: BedHistoryCorrectionModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div
                className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <div>
                            <h2 className="text-xl font-bold text-white">Correct History</h2>
                            <p className="text-sm text-zinc-400">
                                {fromStageName || 'Admission'} → {toStageName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-full"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <BedHistoryCorrectionForm
                    onClose={onClose}
                    onSuccess={onSuccess}
                    logId={logId}
                    initialDurationMs={initialDurationMs}
                    initialNotes={initialNotes}
                />
            </div>
        </div>
    )
}
