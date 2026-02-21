'use client'

// Component — EPIC 9: Daily AI Summary Generator
// Displays a single daily summary as a readable stat card.

import type { DailySummary } from '../types/daily-summary'

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

export function DailySummaryCard({ summary }: DailySummaryCardProps) {
    const date = new Date(summary.summaryDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })

    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">{date}</h3>
                {summary.metadata.mostDelayedStage && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive font-medium">
                        Most delayed: {summary.metadata.mostDelayedStage}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatItem label="Patients" value={summary.totalPatients} />
                <StatItem label="Beds Used" value={summary.totalBedsUsed} />
                <StatItem label="Avg TAT" value={`${summary.avgTatMinutes} min`} />
                <StatItem label="Avg Stage Time" value={`${summary.avgStageTimeMinutes} min`} />
            </div>

            {summary.aiSummary && (
                <div className="rounded-lg bg-muted/50 p-3 italic text-sm text-foreground/90 leading-relaxed border-l-4 border-primary/30">
                    <q>{summary.aiSummary}</q>
                </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Delays: <strong className="text-foreground">{summary.delayCount}</strong></span>
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
