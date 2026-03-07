'use client'
// Stage History Table — renders the results table for stage change history
// US-12.2: Audit log compliance table

import type { StageHistoryRow } from '../lib/stage-history-queries'

function fmtDuration(ms: number | null) {
    if (!ms || ms < 0) return '—'
    const min = Math.round(ms / 60000)
    if (min < 60) return `${min}m`
    return `${Math.floor(min / 60)}h ${min % 60}m`
}

interface Props {
    rows: StageHistoryRow[]
}

export function StageHistoryTable({ rows }: Props) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                        <th className="pb-3 text-left font-medium pr-4">Timestamp</th>
                        <th className="pb-3 text-left font-medium pr-4">Bed</th>
                        <th className="pb-3 text-left font-medium pr-4">From Stage</th>
                        <th className="pb-3 text-left font-medium pr-4">To Stage</th>
                        <th className="pb-3 text-left font-medium pr-4">Duration</th>
                        <th className="pb-3 text-left font-medium pr-4">User</th>
                        <th className="pb-3 text-left font-medium pr-4">Shift</th>
                        <th className="pb-3 text-left font-medium">Notes</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                    {rows.map(row => (
                        <tr key={row.id} className="hover:bg-zinc-800/20 transition-colors">
                            <td className="py-3 pr-4 text-zinc-300 whitespace-nowrap text-xs">
                                {new Date(row.transition_time).toLocaleString('en-US', {
                                    year: 'numeric', month: 'short', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                })}
                            </td>
                            <td className="py-3 pr-4 text-white font-medium">{row.bed_number}</td>
                            <td className="py-3 pr-4 text-zinc-400 text-xs">
                                {row.from_stage ?? <span className="italic text-zinc-600">—</span>}
                            </td>
                            <td className="py-3 pr-4 text-blue-300 font-medium text-xs">{row.to_stage}</td>
                            <td className="py-3 pr-4 text-zinc-400 text-xs">{fmtDuration(row.duration_prev_ms)}</td>
                            <td className="py-3 pr-4">
                                <div className="text-zinc-200 text-xs">{row.changed_by_username ?? '—'}</div>
                                {row.changed_by_role && <div className="text-zinc-500 text-xs capitalize">{row.changed_by_role}</div>}
                            </td>
                            <td className="py-3 pr-4 text-zinc-400 text-xs">{row.shift_name ?? '—'}</td>
                            <td className="py-3 text-zinc-500 text-xs max-w-[160px] truncate" title={row.notes ?? ''}>
                                {row.notes ?? '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
