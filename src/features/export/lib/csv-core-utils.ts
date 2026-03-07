/** Wrap a cell value in quotes and escape inner quotes. */
export function q(value: string | number | null | undefined): string {
    const s = value == null ? '' : String(value)
    return `"${s.replace(/"/g, '""')}"`
}

export function row(...cells: (string | number | null | undefined)[]): string {
    return cells.map(q).join(',')
}

export function msToMinutes(ms: number | null | undefined): string {
    if (ms == null) return 'N/A'
    return (ms / 60_000).toFixed(1)
}

export function formatIso(d: Date | null | undefined): string {
    if (!d) return 'N/A'
    return d instanceof Date ? d.toISOString() : String(d)
}
