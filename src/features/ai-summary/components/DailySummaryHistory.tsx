'use client'

// Component — EPIC 9 (US-9.5): Extended history view with search, date-range,
// status filter, approval display, and CSV export.

import { useEffect, useRef, useState } from 'react'
import { fetchDailySummaryHistory } from '../actions/daily-summary-actions'
import { DailySummaryCard } from './DailySummaryCard'
import { DailySummaryReviewCard } from './DailySummaryReviewCard'
import { SummaryHistoryToolbar } from './SummaryHistoryToolbar'
import type { DailySummary } from '../types/daily-summary'
import type { SummaryStatusFilter } from '../lib/daily-summary-store'

interface Props {
    /** If true, draft summaries render with review controls. */
    canReview?: boolean
    /** If true, only 'published' status chip is shown (auditor view). */
    auditorView?: boolean
}

const ALL_STATUS_OPTIONS: { value: SummaryStatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'rejected', label: 'Rejected' },
]

const AUDITOR_STATUS_OPTIONS: { value: SummaryStatusFilter; label: string }[] = [
    { value: 'published', label: 'Published' },
]

/** Returns YYYY-MM-DD strings for today and 90 days ago. */
function defaultDateRange(): { from: string; to: string } {
    const to = new Date().toISOString().slice(0, 10)
    const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
    return { from, to }
}

export function DailySummaryHistory({ canReview = false, auditorView = false }: Props) {
    const defaults = defaultDateRange()
    const [from, setFrom] = useState(defaults.from)
    const [to, setTo] = useState(defaults.to)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState<SummaryStatusFilter>(
        auditorView ? 'published' : 'all'
    )
    const [summaries, setSummaries] = useState<DailySummary[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Debounce search text (300 ms)
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

    const load = async (params: {
        from: string; to: string; search: string; status: SummaryStatusFilter
    }) => {
        setLoading(true)
        setError(null)
        const result = await fetchDailySummaryHistory({
            from: params.from || undefined,
            to: params.to || undefined,
            search: params.search || undefined,
            status: params.status,
        })
        if (result.success && result.summaries) {
            setSummaries(result.summaries)
        } else {
            setError(result.error ?? 'Failed to load history')
        }
        setLoading(false)
    }

    // Initial load
    useEffect(() => {
        load({ from, to, search, status })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleFromChange = (v: string) => {
        setFrom(v)
        load({ from: v, to, search, status })
    }
    const handleToChange = (v: string) => {
        setTo(v)
        load({ from, to: v, search, status })
    }
    const handleStatusChange = (v: SummaryStatusFilter) => {
        setStatus(v)
        load({ from, to, search: search, status: v })
    }
    const handleSearchChange = (v: string) => {
        setSearch(v)
        if (searchDebounce.current) clearTimeout(searchDebounce.current)
        searchDebounce.current = setTimeout(() => {
            load({ from, to, search: v, status })
        }, 300)
    }

    const handleUpdate = (updated: DailySummary) => {
        setSummaries((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    }

    const statusOptions = auditorView ? AUDITOR_STATUS_OPTIONS : ALL_STATUS_OPTIONS

    return (
        <div className="flex flex-col gap-4">
            <SummaryHistoryToolbar
                from={from}
                to={to}
                search={search}
                status={status}
                statusOptions={statusOptions}
                summaries={summaries}
                loading={loading}
                onFromChange={handleFromChange}
                onToChange={handleToChange}
                onSearchChange={handleSearchChange}
                onStatusChange={handleStatusChange}
            />

            {loading && (
                <div className="flex flex-col gap-4 animate-pulse">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 rounded-xl border bg-zinc-900/50 border-zinc-800" />
                    ))}
                </div>
            )}

            {!loading && error && (
                <div className="p-4 rounded-lg bg-red-900/10 border border-red-900/30 text-red-500 text-sm italic">
                    {error}
                </div>
            )}

            {!loading && !error && summaries.length === 0 && (
                <div className="text-center p-8 rounded-xl border border-dashed border-zinc-800 text-zinc-500 text-sm">
                    No summaries found for the selected filters.
                </div>
            )}

            {!loading && !error && summaries.length > 0 && (
                <div className="grid gap-4">
                    <p className="text-xs text-muted-foreground">
                        {summaries.length} result{summaries.length !== 1 ? 's' : ''}
                    </p>
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
            )}
        </div>
    )
}
