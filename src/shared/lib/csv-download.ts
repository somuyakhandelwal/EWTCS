// Shared CSV download utility — used by ai-summary, export, and shift-management.
// Single canonical implementation, DOM-safe (appends anchor before click for Firefox).

/**
 * Triggers a browser file download for the given CSV string.
 * No-op in non-browser environments (SSR/server actions).
 *
 * @param csv      - The CSV string content to download.
 * @param filename - The filename to save as (e.g. 'report-2026-02-27.csv').
 */
export function downloadCsv(csv: string, filename: string): void {
    if (typeof window === 'undefined') return
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
