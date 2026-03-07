'use client'

// EPIC 9 (US-9.2): In-app notification when draft summaries await review

import { useEffect, useState } from 'react'
import { FileEdit } from 'lucide-react'
import { fetchDraftSummariesPendingReview } from '../actions/daily-summary-review-actions'

interface SupervisorSummaryBannerProps {
    onDismiss?: () => void
}

export function SupervisorSummaryBanner({ onDismiss }: SupervisorSummaryBannerProps) {
    const [count, setCount] = useState(0)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        fetchDraftSummariesPendingReview(50).then((res) => {
            if (res.success && res.summaries) setCount(res.summaries.length)
        })
    }, [])

    const handleDismiss = () => {
        setDismissed(true)
        onDismiss?.()
    }

    if (count === 0 || dismissed) return null

    return (
        <div
            role="alert"
            className="flex items-center justify-between gap-4 rounded-lg border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-amber-200"
        >
            <div className="flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-amber-400" />
                <span className="text-sm font-medium">
                    {count} daily summar{count === 1 ? 'y' : 'ies'} awaiting your review
                </span>
            </div>
            <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-amber-400 hover:text-amber-300 underline"
                aria-label="Dismiss banner"
            >
                Dismiss
            </button>
        </div>
    )
}
