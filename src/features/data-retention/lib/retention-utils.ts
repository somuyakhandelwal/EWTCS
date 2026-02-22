export function formatDate(d: Date | string | null): string {
    if (!d) return '—'
    return new Date(d).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

export function msToHours(ms: number): string {
    return (ms / 3_600_000).toFixed(1) + ' h'
}
