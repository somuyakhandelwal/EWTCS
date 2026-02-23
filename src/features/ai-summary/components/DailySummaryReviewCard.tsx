'use client'

// EPIC 9 (US-9.2, US-9.3): Draft summary with edit, approve, reject, and insight flagging

import { useState } from 'react'
import { Check, X, Pencil } from 'lucide-react'
import { DailySummaryCard } from './DailySummaryCard'
import { InsightWithConfidence } from './InsightWithConfidence'
import {
    approveSummary,
    rejectSummary,
    updateSummaryDraftAction,
    flagInsightAction,
} from '../actions/daily-summary-review-actions'
import type { DailySummary, AiInsight } from '../types/daily-summary'

interface DailySummaryReviewCardProps {
    summary: DailySummary
    onUpdate?: (summary: DailySummary) => void
}

export function DailySummaryReviewCard({ summary, onUpdate }: DailySummaryReviewCardProps) {
    const [editing, setEditing] = useState(false)
    const [editText, setEditText] = useState(summary.aiSummary ?? '')
    const [editInsights, setEditInsights] = useState<AiInsight[]>(summary.aiInsights ?? [])
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isDraft = summary.status === 'draft'

    const handleApprove = async () => {
        setPending(true)
        setError(null)
        const res = await approveSummary({ id: summary.id })
        setPending(false)
        if (res.success && res.summary) onUpdate?.(res.summary)
        else setError(res.error ?? 'Failed')
    }

    const handleReject = async () => {
        setPending(true)
        setError(null)
        const res = await rejectSummary({ id: summary.id })
        setPending(false)
        if (res.success && res.summary) onUpdate?.(res.summary)
        else setError(res.error ?? 'Failed')
    }

    const handleSaveEdit = async () => {
        setPending(true)
        setError(null)
        const res = await updateSummaryDraftAction({
            id: summary.id,
            aiSummary: editText,
            aiInsights: editInsights,
        })
        setPending(false)
        if (res.success && res.summary) {
            setEditText(res.summary.aiSummary ?? '')
            setEditInsights(res.summary.aiInsights ?? [])
            setEditing(false)
            onUpdate?.(res.summary)
        } else setError(res.error ?? 'Failed')
    }

    const handleFlag = async (sid: string, iid: string) => {
        const res = await flagInsightAction({ summaryId: sid, insightId: iid })
        if (res.success && res.summary) {
            setEditInsights(res.summary.aiInsights ?? [])
            onUpdate?.(res.summary)
        }
    }

    if (!isDraft) {
        return <DailySummaryCard summary={summary} />
    }

    return (
        <div className="rounded-xl border border-amber-800/50 bg-card p-4 shadow-sm space-y-4">
            {editing ? (
                <>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-amber-400">Editing draft</span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setEditing(false)}
                                className="text-xs text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={pending}
                                className="text-xs text-primary font-medium hover:underline disabled:opacity-50"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full min-h-[120px] rounded border bg-background px-3 py-2 text-sm"
                        placeholder="Summary text..."
                    />
                    {editInsights.length > 0 && (
                        <ul className="space-y-1">
                            {editInsights.map((i) => (
                                <InsightWithConfidence
                                    key={i.id}
                                    insight={i}
                                    summaryId={summary.id}
                                    onFlag={handleFlag}
                                    canFlag
                                />
                            ))}
                        </ul>
                    )}
                </>
            ) : (
                <>
                    <DailySummaryCard summary={summary} />
                    {(summary.aiInsights?.length ?? 0) > 0 && (
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium uppercase">
                                Insights (click flag to mark for review)
                            </span>
                            <ul className="space-y-0">
                                {summary.aiInsights!.map((i) => (
                                    <InsightWithConfidence
                                        key={i.id}
                                        insight={i}
                                        summaryId={summary.id}
                                        onFlag={handleFlag}
                                        canFlag
                                    />
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
                        <button
                            type="button"
                            onClick={() => setEditing(true)}
                            disabled={pending}
                            className="flex items-center gap-1.5 rounded bg-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-600 disabled:opacity-50"
                        >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                            type="button"
                            onClick={handleApprove}
                            disabled={pending}
                            className="flex items-center gap-1.5 rounded bg-emerald-700 px-3 py-1.5 text-sm hover:bg-emerald-600 disabled:opacity-50"
                        >
                            <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                            type="button"
                            onClick={handleReject}
                            disabled={pending}
                            className="flex items-center gap-1.5 rounded bg-red-800 px-3 py-1.5 text-sm hover:bg-red-700 disabled:opacity-50"
                        >
                            <X className="h-3.5 w-3.5" /> Reject
                        </button>
                    </div>
                </>
            )}
            {error && (
                <p className="text-xs text-red-400" role="alert">
                    {error}
                </p>
            )}
        </div>
    )
}
