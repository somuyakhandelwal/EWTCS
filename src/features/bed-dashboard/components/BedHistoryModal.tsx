"use client"

import { Clock, User, ArrowRight, History, X } from "lucide-react"

interface BedHistoryLog {
    id: string
    fromStageName: string | null
    toStageName: string
    changedByName: string
    transitionTime: string
    durationMs: number | null
    notes: string | null
}

interface BedHistoryModalProps {
    isOpen: boolean
    onClose: () => void
    bedNumber: string | null
    history: BedHistoryLog[]
    isLoading?: boolean
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

export function BedHistoryModal({
    isOpen,
    onClose,
    bedNumber,
    history,
    isLoading = false,
}: BedHistoryModalProps) {
    if (!isOpen) return null

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
                                    <div key={log.id} className="relative pl-12">
                                        {/* Timeline Dot */}
                                        <div className="absolute left-0 top-1.5 w-[36px] flex justify-center">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-500/10 z-10" />
                                        </div>

                                        <div className="bg-zinc-800/30 border border-zinc-800/50 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                                            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-zinc-500 text-xs line-through opacity-60">
                                                        {log.fromStageName || "Admission"}
                                                    </span>
                                                    <ArrowRight className="h-3 w-3 text-zinc-600" />
                                                    <span className="text-blue-400 font-bold text-sm bg-blue-500/5 px-2 py-1 rounded">
                                                        {log.toStageName}
                                                    </span>
                                                </div>
                                                <span className="text-zinc-500 text-xs font-mono">
                                                    {new Date(log.transitionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                                <div className="flex items-center gap-2 text-zinc-400">
                                                    <User className="h-3.5 w-3.5 text-zinc-500" />
                                                    <span>Updated by <span className="text-zinc-300">{log.changedByName}</span></span>
                                                </div>
                                                {log.durationMs !== null && (
                                                    <div className="flex items-center gap-2 text-zinc-400">
                                                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                                                        <span>Time spent in <span className="text-zinc-300">&quot;{log.fromStageName || 'Admission'}&quot;</span>: <span className="text-white font-medium">{formatDuration(log.durationMs)}</span></span>
                                                    </div>
                                                )}
                                            </div>

                                            {log.notes && (
                                                <div className="mt-3 pt-3 border-t border-zinc-800/50">
                                                    <p className="text-xs text-zinc-500 italic">&quot;{log.notes}&quot;</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 text-center">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-8 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                        Close Timeline
                    </button>
                </div>
            </div>
        </div>
    )
}
