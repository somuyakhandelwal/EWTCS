'use client'

// EPIC 9: Supervisor section for reviewing draft summaries

import { useEffect, useState } from 'react'
import { SupervisorSummaryBanner } from './SupervisorSummaryBanner'
import { DailySummaryReviewCard } from './DailySummaryReviewCard'
import { DailySummaryCard } from './DailySummaryCard'
import { fetchDraftSummariesPendingReview } from '../actions/daily-summary-review-actions'
import type { DailySummary } from '../types/daily-summary'

export function SupervisorSummarySection() {
    const [drafts, setDrafts] = useState<DailySummary[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = async () => {
        setLoading(true)
        const res = await fetchDraftSummariesPendingReview(30)
        if (res.success && res.summaries) setDrafts(res.summaries)
        else setError(res.error ?? 'Failed to load')
        setLoading(false)
    }

    useEffect(() => {
        load()
    }, [])

    const handleUpdate = (updated: DailySummary) => {
        if (updated.status !== 'draft') {
            setDrafts((prev) => prev.filter((s) => s.id !== updated.id))
        } else {
            setDrafts((prev) =>
                prev.map((s) => (s.id === updated.id ? updated : s))
            )
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-4 animate-pulse">
                {[1, 2].map((i) => (
                    <div key={i} className="h-40 rounded-xl border bg-zinc-900/50 border-zinc-800" />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-lg bg-red-900/10 border border-red-900/30 p-4 text-red-500 text-sm">
                {error}
            </div>
        )
    }

    if (drafts.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-500 text-sm">
                No draft summaries pending review.
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <SupervisorSummaryBanner />
            <div className="grid gap-4">
                {drafts.map((s) => (
                    <DailySummaryReviewCard
                        key={s.id}
                        summary={s}
                        onUpdate={handleUpdate}
                    />
                ))}
            </div>
        </div>
    )
}
