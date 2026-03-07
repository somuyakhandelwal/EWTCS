'use client'
// Archive Table sub-component
// US-14.3: Display search results for historical archived bed stage log data

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

interface ArchiveTableProps {
    rows: ArchiveRow[]
}

export function ArchiveTable({ rows }: ArchiveTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-zinc-700 text-left">
                        <th className="px-3 py-2 text-xs text-zinc-400 font-medium">Timestamp</th>
                        <th className="px-3 py-2 text-xs text-zinc-400 font-medium">Bed</th>
                        <th className="px-3 py-2 text-xs text-zinc-400 font-medium">Ward</th>
                        <th className="px-3 py-2 text-xs text-zinc-400 font-medium">From Stage</th>
                        <th className="px-3 py-2 text-xs text-zinc-400 font-medium">To Stage</th>
                        <th className="px-3 py-2 text-xs text-zinc-400 font-medium">Duration</th>
                        <th className="px-3 py-2 text-xs text-zinc-400 font-medium">Notes</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors">
                            <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">
                                {fmtTs(row.transitionTime)}
                            </td>
                            <td className="px-3 py-2 text-zinc-200 font-medium whitespace-nowrap">
                                {row.bedNumber}
                            </td>
                            <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">
                                {row.wardName ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">
                                {row.fromStage ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">
                                {row.toStage ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-zinc-400 whitespace-nowrap tabular-nums">
                                {fmtDuration(row.durationMs)}
                            </td>
                            <td className="px-3 py-2 text-zinc-500 max-w-[220px] truncate">
                                {row.notes ?? '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
