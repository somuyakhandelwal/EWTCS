'use client'

// Component — EPIC 9 (US-9.5): Toolbar for browsing historical AI summaries.
// Provides date-range pickers, text search, status filter, and CSV export.

import { formatSummariesAsCsv, downloadCsv } from '../lib/summary-csv-export'
import type { DailySummary } from '../types/daily-summary'
import type { SummaryStatusFilter } from '../lib/daily-summary-store'

interface SummaryHistoryToolbarProps {
    from: string
    to: string
    search: string
    status: SummaryStatusFilter
    /** Available status options — admin/supervisor see all; auditor sees only 'published' */
    statusOptions: { value: SummaryStatusFilter; label: string }[]
    summaries: DailySummary[]
    loading: boolean
    onFromChange: (v: string) => void
    onToChange: (v: string) => void
    onSearchChange: (v: string) => void
    onStatusChange: (v: SummaryStatusFilter) => void
}

/** Returns today's date string in YYYY-MM-DD (local time). */
function todayString(): string {
    return new Date().toISOString().slice(0, 10)
}

export function SummaryHistoryToolbar({
    from,
    to,
    search,
    status,
    statusOptions,
    summaries,
    loading,
    onFromChange,
    onToChange,
    onSearchChange,
    onStatusChange,
}: SummaryHistoryToolbarProps) {
    function handleExport() {
        const csv = formatSummariesAsCsv(summaries)
        const name = `ai-summaries-${from ?? 'all'}-to-${to ?? todayString()}.csv`
        downloadCsv(csv, name)
    }

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            {/* Row 1: date range + search */}
            <div className="flex flex-wrap gap-3 items-end">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    From
                    <input
                        type="date"
                        value={from}
                        max={to || todayString()}
                        onChange={(e) => onFromChange(e.target.value)}
                        className="rounded-md border border-border bg-muted px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    To
                    <input
                        type="date"
                        value={to}
                        min={from}
                        max={todayString()}
                        onChange={(e) => onToChange(e.target.value)}
                        className="rounded-md border border-border bg-muted px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </label>
                <label className="flex flex-col gap-1 flex-1 min-w-48 text-xs text-muted-foreground">
                    Search summary text
                    <input
                        type="search"
                        placeholder="e.g. bottleneck, discharge…"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </label>
            </div>

            {/* Row 2: status chips + export */}
            <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap gap-1.5">
                    {statusOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => onStatusChange(opt.value)}
                            className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${status === opt.value
                                ? 'border-primary bg-primary/20 text-primary'
                                : 'border-border text-muted-foreground hover:border-zinc-500'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleExport}
                    disabled={loading || summaries.length === 0}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                    ⬇ Export CSV
                </button>
            </div>
        </div>
    )
}
