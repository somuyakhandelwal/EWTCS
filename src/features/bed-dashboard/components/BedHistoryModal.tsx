"use client"
import { useState } from "react"
import { Clock, History, X } from "lucide-react"
import { BedHistoryCorrectionModal } from "./BedHistoryCorrectionModal"
import { BedHistoryTimelineItem } from "./BedHistoryTimelineItem"
import type { BedHistoryLog } from "../lib/bed-queries"

// Use imported type instead of local interface
// Use imported type instead of local interface for type safety across the application

/**
 * Props for the BedHistoryModal component.
 * 
 * @property {boolean} isOpen - Controls whether the modal is currently visible.
 * @property {() => void} onClose - Callback function to handle closing the modal.
 * @property {string | null} bedNumber - The identifier of the bed being viewed.
 * @property {BedHistoryLog[]} history - Array of history log entries to display.
 * @property {boolean} [isLoading] - Optional flag to indicate if history data is being fetched.
 * @property {boolean} [canEdit] - Optional flag (default false) to show edit controls.
 *                                 Should only be true for supervisors/admins.
 * @property {() => void} [onHistoryUpdate] - Callback triggered when a correction is successfully made.
 */
interface BedHistoryModalProps {
    isOpen: boolean
    onClose: () => void
    bedNumber: string | null
    history: BedHistoryLog[]
    isLoading?: boolean
    canEdit?: boolean // Added for supervisor access
    onHistoryUpdate?: () => void
}
/**
 * Format milliseconds into a human-readable duration (e.g., "1h 23m")
 */
function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (hours > 0) {
        return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes}m`
}
/**
 * Main BedHistoryModal Component.
 * Displays the full timeline of stage transitions for a specific bed.
 * Allows supervisors to initiate corrections on past entries.
 * 
 * @param {BedHistoryModalProps} props - Component props
 * @returns {JSX.Element | null} The rendered modal or null if not open.
 */
export function BedHistoryModal({
    isOpen,
    onClose,
    bedNumber,
    history,
    isLoading = false,
    canEdit = false,
    onHistoryUpdate
}: BedHistoryModalProps) {
    // State to track which log entry is currently being corrected
    // When non-null, the correction modal for that specific log entry is displayed
    const [correctingLog, setCorrectingLog] = useState<BedHistoryLog | null>(null)

    // If not open, do not render anything to avoid z-index issues or unnecessary processing
    if (!isOpen) return null

    // Handlers

    /**
     * Opens the correction modal for a specific log entry.
     * 
     * @param {BedHistoryLog} log - The history log entry to correct.
     */
    const handleEdit = (log: BedHistoryLog) => {
        setCorrectingLog(log)
    }

    /**
     * Handles the successful completion of a correction.
     * Closes the correction modal and triggers the refresh callback.
     */
    const handleCorrectionSuccess = () => {
        setCorrectingLog(null)
        onHistoryUpdate?.()
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <History className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Patient Journey: {bedNumber}</h2>
                            <p className="text-sm text-zinc-400">Chronological history of all stage transitions</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-full"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className="text-zinc-500 animate-pulse">Retrieving history...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="inline-flex p-4 bg-zinc-800/50 rounded-full mb-4">
                                <Clock className="h-8 w-8 text-zinc-600" />
                            </div>
                            <p className="text-zinc-400">No transition history found for the current patient.</p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Timeline Line */}
                            <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-zinc-800" />

                            <div className="space-y-8">
                                {history.map((log) => (
                                    <BedHistoryTimelineItem
                                        key={log.id}
                                        log={log}
                                        canEdit={canEdit}
                                        onEdit={handleEdit}
                                        formatDuration={formatDuration}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {/* Footer */}
                <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 text-center">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-8 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-medium text-sm">
                        Close Timeline
                    </button>
                </div>
            </div>
            {/* Correction Modal */}
            <BedHistoryCorrectionModal
                isOpen={!!correctingLog}
                onClose={() => setCorrectingLog(null)}
                onSuccess={handleCorrectionSuccess}
                logId={correctingLog?.id ?? null}
                initialDurationMs={correctingLog?.durationInPreviousStageMs ?? null}
                initialNotes={correctingLog?.notes ?? null}
                fromStageName={correctingLog?.fromStageName ?? null}
                toStageName={correctingLog?.toStageName ?? null}
            />
        </div>
    )
}
