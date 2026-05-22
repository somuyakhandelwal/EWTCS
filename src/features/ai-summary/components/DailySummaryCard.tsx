'use client'

// Component — EPIC 9: Daily AI Summary Generator
// Displays a single daily summary as a readable stat card.

import type { DailySummary } from '../types/daily-summary'

const CONFIDENCE_HELP =
    'Confidence (0-100%): Based on data quality. High (≥70%): Strong data. ' +
    'Medium (50-69%): Moderate sample. Low (<50%): Sparse data — scrutinize carefully.'

interface DailySummaryCardProps {
    summary: DailySummary
}

function StatItem({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
            <span className="text-base font-semibold tabular-nums">{value}</span>
        </div>
    )
}

function StatusBadge({ status }: { status: DailySummary['status'] }) {
    const styles = {
        draft: 'bg-amber-900/30 text-amber-400 border-amber-700/50',
        published: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/50',
        rejected: 'bg-red-900/30 text-red-400 border-red-700/50',
    }
    return (
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
            {status}
        </span>
    )
}

export function DailySummaryCard({ summary }: DailySummaryCardProps) {
    const date = new Date(summary.summaryDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
    const status = summary.status ?? 'draft'
    const insights = summary.aiInsights ?? []

    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground">{date}</h3>
                <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    {summary.metadata?.mostDelayedStage && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive font-medium">
                            Most delayed: {summary.metadata.mostDelayedStage}
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatItem label="Patients" value={summary.totalPatients} />
                <StatItem label="Beds Used" value={summary.totalBedsUsed} />
                <StatItem label="Avg Workflow TAT" value={`${summary.avgTatMinutes} min`} />
                {typeof summary.metadata?.avgErTatMinutes === 'number' && (
                    <StatItem label="Avg ER TAT" value={`${summary.metadata.avgErTatMinutes} min`} />
                )}
                {typeof summary.metadata?.avgTriageTatMinutes === 'number' && (
                    <StatItem
                        label="Avg Triage TAT"
                        value={`${summary.metadata.avgTriageTatMinutes} min`}
                    />
                )}
                <StatItem label="Avg Stage Time" value={`${summary.avgStageTimeMinutes} min`} />
            </div>

            {summary.aiSummary && (
                <div className="rounded-lg bg-muted/50 p-3 italic text-sm text-foreground/90 leading-relaxed border-l-4 border-primary/30">
                    <q>{summary.aiSummary}</q>
                </div>
            )}

            {insights.length > 0 && (
                <div className="space-y-2">
                    <span
                        className="text-xs text-muted-foreground font-medium uppercase cursor-help"
                        title={CONFIDENCE_HELP}
                    >
                        Key insights
                    </span>
                    <ul className="space-y-1">
                        {insights.map((i) => (
                            <li key={i.id} className="flex items-start gap-2 text-sm">
                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium tabular-nums ${
                                    (i.confidence ?? 0) >= 70 ? 'bg-emerald-900/30 text-emerald-400' :
                                    (i.confidence ?? 0) >= 50 ? 'bg-amber-900/30 text-amber-400' :
                                    'bg-red-900/30 text-red-400'
                                }`}>
                                    {i.confidence ?? 0}%
                                </span>
                                <span className={i.flagged ? 'ring-1 ring-amber-500/50 rounded px-1' : ''}>
                                    {i.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-1">
                <span>Delays: <strong className="text-foreground">{summary.delayCount}</strong></span>
                {typeof summary.metadata?.meetsWordCountRequirement === 'boolean' && !summary.metadata.meetsWordCountRequirement && summary.metadata.summaryWordCount != null && (
                    <span
                        className="text-amber-500"
                        title="Summary is outside 200-300 word target"
                    >
                        {summary.metadata.summaryWordCount} words (target 200-300)
                    </span>
                )}
                <span>
                    Generated:{' '}
                    {new Date(summary.generatedAt).toLocaleString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short',
                    })}
                </span>
            </div>
        </div>
    )
}
