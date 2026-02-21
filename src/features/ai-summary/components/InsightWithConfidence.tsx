'use client'

// EPIC 9 (US-9.3): Single insight with confidence score and flag for review

import { Flag } from 'lucide-react'
import type { AiInsight } from '../types/daily-summary'

const CONFIDENCE_HELP =
    'Confidence (0-100%): Based on data quality. High (≥70%): Strong data (≥10 patients). ' +
    'Medium (50-69%): Moderate sample. Low (<50%): Sparse data — scrutinize carefully.'

interface InsightWithConfidenceProps {
    insight: AiInsight
    summaryId: string
    onFlag?: (summaryId: string, insightId: string) => void
    canFlag?: boolean
}

export function InsightWithConfidence({
    insight,
    summaryId,
    onFlag,
    canFlag = false,
}: InsightWithConfidenceProps) {
    const confidence = insight.confidence ?? 0
    const isLow = confidence < 50
    const confidenceClass = confidence >= 70
        ? 'bg-emerald-900/40 text-emerald-400'
        : confidence >= 50
            ? 'bg-amber-900/40 text-amber-400'
            : 'bg-red-900/40 text-red-400'

    return (
        <li
            className={`flex items-start gap-2 text-sm py-1.5 px-2 rounded ${
                isLow ? 'bg-red-900/10 ring-1 ring-red-800/40' : ''
            } ${insight.flagged ? 'ring-1 ring-amber-500/50' : ''}`}
        >
            <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium tabular-nums ${confidenceClass}`}
                title={CONFIDENCE_HELP}
            >
                {confidence}%
            </span>
            <span className="flex-1">{insight.text}</span>
            {canFlag && onFlag && (
                <button
                    type="button"
                    onClick={() => onFlag(summaryId, insight.id)}
                    className={`shrink-0 p-1 rounded hover:bg-white/10 ${insight.flagged ? 'text-amber-400' : 'text-muted-foreground'}`}
                    title={insight.flagged ? 'Unflag' : 'Flag for review'}
                    aria-label={insight.flagged ? 'Unflag insight' : 'Flag insight for review'}
                >
                    <Flag className="h-3.5 w-3.5" fill={insight.flagged ? 'currentColor' : 'none'} />
                </button>
            )}
        </li>
    )
}
