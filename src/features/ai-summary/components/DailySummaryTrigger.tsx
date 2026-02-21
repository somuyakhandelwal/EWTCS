'use client'

// Component — EPIC 9: Daily AI Summary Generator
// Admin button to manually trigger aggregation for a given date (defaults to yesterday).

import { useState } from 'react'
import { useDailySummary } from '../hooks/use-daily-summary'

interface DailySummaryTriggerProps {
    /** Pre-fill the target date. Defaults to yesterday (UTC) when omitted. */
    defaultDate?: string
    onSuccess?: () => void
}

function yesterdayUtc(): string {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
}

export function DailySummaryTrigger({ defaultDate, onSuccess }: DailySummaryTriggerProps) {
    const [date, setDate] = useState(defaultDate ?? yesterdayUtc())
    const { triggering, error, triggerSuccess, trigger } = useDailySummary()

    const handleClick = async () => {
        await trigger(date)
        onSuccess?.()
    }

    return (
        <div className="space-y-3">
            <div className="flex items-end gap-3">
                <div className="flex flex-col gap-1">
                    <label htmlFor="summary-date" className="text-xs text-muted-foreground font-medium">
                        Date to aggregate
                    </label>
                    <input
                        id="summary-date"
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        disabled={triggering}
                        className="rounded-md border bg-background px-3 py-1.5 text-sm text-foreground
                                   focus:outline-none focus:ring-2 focus:ring-ring
                                   disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>

                <button
                    id="trigger-daily-summary-btn"
                    type="button"
                    onClick={handleClick}
                    disabled={triggering || !date}
                    className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium
                               text-primary-foreground shadow-sm transition-opacity
                               hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {triggering ? (
                        <>
                            <span
                                aria-hidden
                                className="inline-block h-4 w-4 animate-spin rounded-full border-2
                                           border-primary-foreground border-t-transparent"
                            />
                            Aggregating…
                        </>
                    ) : (
                        'Generate Summary'
                    )}
                </button>
            </div>

            {triggerSuccess && !triggering && (
                <p role="status" className="text-xs text-green-600 font-medium">
                    ✅ Summary generated successfully for {date}.
                </p>
            )}

            {error && (
                <p role="alert" className="text-xs text-destructive font-medium">
                    ❌ {error}
                </p>
            )}
        </div>
    )
}
