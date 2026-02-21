'use client'

// Component — EPIC 9: Daily AI Summary Generator
// Fetches and displays a history of daily summaries in a list format.

import { useEffect, useState } from 'react'
import { fetchRecentDailySummaries } from '../actions/daily-summary-actions'
import { DailySummaryCard } from './DailySummaryCard'
import { DailySummaryReviewCard } from './DailySummaryReviewCard'
import type { DailySummary } from '../types/daily-summary'

interface DailySummaryHistoryProps {
    /** If true, drafts render with review controls (edit/approve/reject) */
    canReview?: boolean
}

export function DailySummaryHistory({ canReview = false }: DailySummaryHistoryProps) {
    const [summaries, setSummaries] = useState<DailySummary[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = async () => {
        setLoading(true)
        const result = await fetchRecentDailySummaries(7) // Last 7 days
        if (result.success && result.summaries) {
            setSummaries(result.summaries)
        } else {
            setError(result.error ?? 'Failed to load summaries')
        }
        setLoading(false)
    }

    const handleUpdate = (updated: DailySummary) => {
        setSummaries((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
        )
    }

    useEffect(() => {
        load()
    }, [])

    if (loading) {
        return (
            <div className="flex flex-col gap-4 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 rounded-xl border bg-zinc-900/50 border-zinc-800" />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 rounded-lg bg-red-900/10 border border-red-900/30 text-red-500 text-sm italic">
                {error}
            </div>
        )
    }

    if (summaries.length === 0) {
        return (
            <div className="text-center p-8 rounded-xl border border-dashed border-zinc-800 text-zinc-500 text-sm">
                No daily summaries generated yet.
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            {summaries.map((summary) =>
                canReview && summary.status === 'draft' ? (
                    <DailySummaryReviewCard
                        key={summary.id}
                        summary={summary}
                        onUpdate={handleUpdate}
                    />
                ) : (
                    <DailySummaryCard key={summary.id} summary={summary} />
                )
            )}
        </div>
    )
}
