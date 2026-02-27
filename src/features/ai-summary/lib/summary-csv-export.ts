// Utility — EPIC 9 (US-9.5): CSV export for historical AI summaries.
// Pure functions — no server/DB dependencies; safe to call from the client.

import type { DailySummary } from '../types/daily-summary'

/** CSV column headers for the export. */
const HEADERS = [
    'Date',
    'Status',
    'Approver',
    'Approved At',
    'Rejection Reason',
    'Patients',
    'Beds Used',
    'Avg TAT (min)',
    'Avg Stage Time (min)',
    'Delays',
    'AI Summary',
]

/**
 * Escapes a value for inclusion in a CSV cell.
 * Wraps in double-quotes and escapes internal quotes.
 */
function csvCell(value: string | number | undefined | null): string {
    const str = value == null ? '' : String(value)
    const escaped = str.replace(/"/g, '""')
    return `"${escaped}"`
}

/**
 * Converts an array of DailySummary objects to CSV string.
 * Always includes the header row; returns header-only for an empty array.
 */
export function formatSummariesAsCsv(summaries: DailySummary[]): string {
    const rows: string[] = [HEADERS.map(csvCell).join(',')]

    for (const s of summaries) {
        rows.push(
            [
                s.summaryDate,
                s.status,
                s.reviewedBy ?? '',
                s.reviewedAt
                    ? new Date(s.reviewedAt).toLocaleString('en-IN')
                    : '',
                s.metadata?.rejectionReason ?? '',
                s.totalPatients,
                s.totalBedsUsed,
                s.avgTatMinutes,
                s.avgStageTimeMinutes,
                s.delayCount,
                s.aiSummary ?? '',
            ]
                .map(csvCell)
                .join(',')
        )
    }

    return rows.join('\r\n')
}

// Re-export shared download utility: DOM-safe (appends to body), Firefox-compatible.
// NOTE: shared signature is (csv, filename) — callers must use this order.
export { downloadCsv } from '@/shared/lib/csv-download'
