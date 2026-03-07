// Archive CSV export helper
// US-14.3: Export archived bed stage log data to CSV

import type { ArchiveRow } from '../lib/retention-queries'

function fmtDuration(ms: number | null): string {
    if (ms == null) return '—'
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
}

function fmtTs(iso: string): string {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function downloadArchiveCSV(rows: ArchiveRow[]): void {
    const header = 'Timestamp,Bed,Ward,From Stage,To Stage,Duration,Notes'
    const body = rows.map((r) =>
        [
            fmtTs(r.transitionTime),
            r.bedNumber,
            r.wardName ?? '',
            r.fromStage ?? '',
            r.toStage ?? '',
            fmtDuration(r.durationMs),
            (r.notes ?? '').replace(/,/g, ';'),
        ].join(',')
    )
    const csv  = [header, ...body].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `archive_export_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
