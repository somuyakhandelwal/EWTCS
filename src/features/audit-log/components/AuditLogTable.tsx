'use client'
// EPIC 12 — Audit Logs & Compliance  US-12.1

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { AuditLogRecord } from '@/shared/lib/audit'

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'text-emerald-400',
    UPDATE: 'text-blue-400',
    DELETE: 'text-red-400',
    ACTIVATE: 'text-green-400',
    DEACTIVATE: 'text-orange-400',
    LOGIN: 'text-cyan-400',
    LOGOUT: 'text-zinc-400',
}

function ChangesCell({ changes }: { changes: Record<string, unknown> }) {
    const [open, setOpen] = useState(false)
    const keys = Object.keys(changes)
    if (keys.length === 0) return <span className="text-zinc-500 italic text-xs">—</span>
    return (
        <div>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white transition-colors"
            >
                {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {keys.length} field{keys.length !== 1 ? 's' : ''}
            </button>
            {open && (
                <pre className="mt-1 p-2 bg-black/60 rounded text-xs text-zinc-300 overflow-auto max-w-xs max-h-32 border border-zinc-700">
                    {JSON.stringify(changes, null, 2)}
                </pre>
            )}
        </div>
    )
}

interface Props {
    rows: AuditLogRecord[]
}

export function AuditLogTable({ rows }: Props) {
    if (rows.length === 0) {
        return (
            <div className="text-center py-12 text-zinc-500">No audit log entries match the current filter.</div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                        <th className="pb-3 text-left font-medium pr-4">Timestamp</th>
                        <th className="pb-3 text-left font-medium pr-4">User</th>
                        <th className="pb-3 text-left font-medium pr-4">Action</th>
                        <th className="pb-3 text-left font-medium pr-4">Entity</th>
                        <th className="pb-3 text-left font-medium pr-4">Entity ID</th>
                        <th className="pb-3 text-left font-medium pr-4">Reason</th>
                        <th className="pb-3 text-left font-medium">Changes</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                    {rows.map(row => (
                        <tr key={row.id} className="hover:bg-zinc-800/20 transition-colors">
                            <td className="py-3 pr-4 text-zinc-300 whitespace-nowrap">
                                {new Date(row.created_at).toLocaleString('en-US', {
                                    year: 'numeric', month: 'short', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                                })}
                            </td>
                            <td className="py-3 pr-4">
                                <div className="text-zinc-200 font-medium">
                                    {row.performed_by_username ?? <span className="text-zinc-500 italic">System</span>}
                                </div>
                                {row.performed_by_role && (
                                    <div className="text-zinc-500 text-xs capitalize">{row.performed_by_role}</div>
                                )}
                            </td>
                            <td className="py-3 pr-4">
                                <span className={`font-semibold text-xs uppercase ${ACTION_COLORS[row.action_type] ?? 'text-zinc-300'}`}>
                                    {row.action_type}
                                </span>
                            </td>
                            <td className="py-3 pr-4 text-zinc-300 capitalize">{row.entity_type}</td>
                            <td className="py-3 pr-4 text-zinc-500 font-mono text-xs max-w-[120px] truncate" title={row.entity_id}>
                                {row.entity_id}
                            </td>
                            <td className="py-3 pr-4 text-zinc-400 text-xs max-w-[140px] truncate" title={row.reason ?? ''}>
                                {row.reason ?? <span className="italic text-zinc-600">—</span>}
                            </td>
                            <td className="py-3">
                                <ChangesCell changes={row.changes ?? {}} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
