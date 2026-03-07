'use client'

// Component — EPIC 9 (US-9.4): Rejection reason modal for daily AI summary review.
// Supervisor must provide a reason (min 10 chars) before rejecting a draft summary.

import { useState } from 'react'
import { X } from 'lucide-react'
import { rejectSummary } from '../actions/daily-summary-review-actions'
import type { DailySummary } from '../types/daily-summary'

interface RejectionReasonModalProps {
    /** ID of the draft summary being rejected */
    summaryId: string
    /** Called with the updated summary on successful rejection */
    onRejected: (summary: DailySummary) => void
    /** Called when the supervisor cancels without rejecting */
    onCancel: () => void
}

const MIN_REASON_LENGTH = 10
const MAX_REASON_LENGTH = 500

/**
 * Modal overlay that captures a mandatory rejection reason (US-9.4).
 * Blocks submission until the reason meets the minimum character requirement.
 */
export function RejectionReasonModal({ summaryId, onRejected, onCancel }: RejectionReasonModalProps) {
    const [reason, setReason] = useState('')
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isValid = reason.trim().length >= MIN_REASON_LENGTH
    const remaining = MAX_REASON_LENGTH - reason.length

    const handleConfirm = async () => {
        if (!isValid) return
        setPending(true)
        setError(null)
        const res = await rejectSummary({ id: summaryId, reason: reason.trim() })
        setPending(false)
        if (res.success && res.summary) {
            onRejected(res.summary)
        } else {
            setError(res.error ?? 'Rejection failed. Please try again.')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onCancel()
    }

    return (
        /* Backdrop */
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rejection-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onKeyDown={handleKeyDown}
        >
            <div className="w-full max-w-md rounded-xl border border-red-800/60 bg-card shadow-xl p-5 space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2
                        id="rejection-modal-title"
                        className="text-base font-semibold text-red-400"
                    >
                        Reject Summary
                    </h2>
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="Cancel rejection"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Instruction */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Provide a clear reason for rejection. This will be logged against your
                    supervisor account and is visible to the team.
                </p>

                {/* Reason textarea */}
                <div className="space-y-1">
                    <label htmlFor="rejection-reason" className="text-xs font-medium text-foreground">
                        Reason <span className="text-red-400">*</span>
                    </label>
                    <textarea
                        id="rejection-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={pending}
                        maxLength={MAX_REASON_LENGTH}
                        rows={4}
                        placeholder="Describe why this summary is being rejected (min 10 characters)…"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none
                                   focus:outline-none focus:ring-2 focus:ring-red-700/50 disabled:opacity-50"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        {reason.trim().length < MIN_REASON_LENGTH && reason.length > 0 && (
                            <span className="text-amber-400">
                                {MIN_REASON_LENGTH - reason.trim().length} more character(s) required
                            </span>
                        )}
                        <span className="ml-auto">{remaining} left</span>
                    </div>
                </div>

                {/* Server error */}
                {error && (
                    <p role="alert" className="text-xs text-red-400">
                        {error}
                    </p>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={pending}
                        className="rounded px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!isValid || pending}
                        className="flex items-center gap-1.5 rounded bg-red-800 px-4 py-2 text-sm
                                   font-medium text-foreground hover:bg-red-700
                                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {pending ? 'Rejecting…' : 'Confirm Reject'}
                    </button>
                </div>
            </div>
        </div>
    )
}
