import { ArrowRight, User, Clock, Edit } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import type { BedHistoryLog } from "../lib/bed-queries"

interface BedHistoryTimelineItemProps {
    log: BedHistoryLog
    canEdit: boolean
    onEdit: (log: BedHistoryLog) => void
    formatDuration: (ms: number) => string
}

export function BedHistoryTimelineItem({ log, canEdit, onEdit, formatDuration }: BedHistoryTimelineItemProps) {
    return (
        <div key={log.id} className="relative pl-12">
            {/* Timeline Dot with Correction Indicator */}
            <div className="absolute left-0 top-1.5 w-[36px] flex justify-center">
                <div className={cn(
                    "w-2.5 h-2.5 rounded-full ring-4 z-10",
                    log.latestCorrection
                        ? "bg-amber-500 ring-amber-500/10"
                        : "bg-blue-500 ring-blue-500/10"
                )} />
            </div>

            <div className={cn(
                "bg-zinc-800/30 border rounded-xl p-4 transition-colors group",
                log.latestCorrection
                    ? "border-amber-900/40 bg-amber-900/5 hover:border-amber-800/60"
                    : "border-zinc-800/50 hover:border-zinc-700"
            )}>
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
                    <div className="flex items-center gap-3">
                        <span className="text-zinc-500 text-xs font-mono">
                            {new Date(log.transitionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        {canEdit ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-zinc-400 hover:text-white transition-colors"
                                onClick={() => onEdit(log)}
                                title="Correct this status entry"
                            >
                                <Edit className="h-3.5 w-3.5" />
                            </Button>
                        ) : (
                            <div className="h-6 w-6 flex items-center justify-center" title="Supervisor access required to correct history">
                                <Edit className="h-3.5 w-3.5 text-zinc-700 opacity-20 cursor-not-allowed" />
                            </div>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center gap-2 text-zinc-400">
                        <User className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Updated by <span className="text-zinc-300">{log.changedByName}</span></span>
                    </div>
                    {/* Display Corrected Duration or Original */
                        (log.durationInPreviousStageMs !== null || log.latestCorrection?.correctedFields?.duration) && (
                            <div className="flex items-center gap-2 text-zinc-400">
                                <Clock className="h-3.5 w-3.5 text-zinc-500" />
                                {log.latestCorrection?.correctedFields?.duration ? (
                                    <span>
                                        Time spent in <span className="text-zinc-300">&quot;{log.fromStageName || 'Admission'}&quot;</span>:{" "}
                                        <span className="text-amber-500 font-medium line-through mr-2" title="Original duration">
                                            {log.durationInPreviousStageMs !== null ? formatDuration(log.durationInPreviousStageMs) : 'N/A'}
                                        </span>
                                        <span className="text-white font-bold bg-amber-500/10 px-1 rounded border border-amber-500/20" title="Corrected duration">
                                            {log.latestCorrection.correctedFields.duration}m
                                        </span>
                                    </span>
                                ) : (
                                    <span>Time spent in <span className="text-zinc-300">&quot;{log.fromStageName || 'Admission'}&quot;</span>: <span className="text-white font-medium">{formatDuration(log.durationInPreviousStageMs!)}</span></span>
                                )}
                            </div>
                        )}
                </div>
                {/* Notes Section with Correction Handling */}
                {log.latestCorrection?.correctedFields?.notes ? (
                    <div className="mt-3 pt-3 border-t border-zinc-800/50">
                        {log.notes && (
                            <p className="text-xs text-zinc-500 line-through mb-1 opacity-60" title="Original note">
                                &quot;{log.notes}&quot;
                            </p>
                        )}
                        <p className="text-xs text-amber-200 italic bg-amber-900/10 p-2 rounded border border-amber-900/30">
                            <span className="font-semibold not-italic text-amber-500 text-[10px] uppercase mr-1">Corrected Note:</span>
                            &quot;{log.latestCorrection.correctedFields.notes}&quot;
                        </p>
                    </div>
                ) : (
                    log.notes && (
                        <div className="mt-3 pt-3 border-t border-zinc-800/50">
                            <p className="text-xs text-zinc-500 italic">&quot;{log.notes}&quot;</p>
                        </div>
                    )
                )}
                {/* Correction Badge */}
                {/* Implementation note: RotateCcw was used in original, make sure it's available or use substitute */}
                {log.latestCorrection && (
                    <div className="mt-3 pt-3 border-t border-amber-900/30 flex items-start gap-2">
                        {/* RotateCcw icon presumed available or substituted */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-amber-500 mt-0.5"
                        >
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                        <div>
                            <p className="text-xs text-amber-500 font-medium">Corrected by {log.latestCorrection.correctedByName}</p>
                            <p className="text-[10px] text-zinc-500 italic">{log.latestCorrection.reason}</p>
                        </div>
                    </div>
                )}
            </div>
        </div >
    )
}
