// ArchiveResultTables — sub-table components for ArchiveSearchView
// EPIC 14 — US-14.3: Auditor Archive Retrieval

import type { ArchivedAdmission, ArchivedAuditLog } from '../lib/data-retention-types'

function formatDate(d: Date | string | null): string {
    if (!d) return '—'
    return new Date(d).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

export function msToHours(ms: number): string {
    return (ms / 3_600_000).toFixed(1) + ' h'
}

// ── Admissions result table ─────────────────────────────────────────────────

export interface AdmissionsTableProps { rows: ArchivedAdmission[] }

export function AdmissionsTable({ rows }: AdmissionsTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-zinc-500 border-b border-zinc-800">
                        <th className="pb-2 text-left font-medium">Admitted</th>
                        <th className="pb-2 text-left font-medium">Discharged</th>
                        <th className="pb-2 text-right font-medium">Duration</th>
                        <th className="pb-2 text-left font-medium">Bed ID</th>
                        <th className="pb-2 text-left font-medium">Notes</th>
                        <th className="pb-2 text-left font-medium">Archived</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                    {rows.map((row) => (
                        <tr key={row.id} className="text-zinc-300">
                            <td className="py-2 pr-4 whitespace-nowrap">{formatDate(row.admittedAt)}</td>
                            <td className="py-2 pr-4 whitespace-nowrap">{formatDate(row.dischargedAt)}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">{msToHours(row.totalDurationMs)}</td>
                            <td className="py-2 pr-4 font-mono text-zinc-400 truncate max-w-[96px]">{row.bedId}</td>
                            <td className="py-2 pr-4 text-zinc-500 truncate max-w-[160px]">{row.notes ?? '—'}</td>
                            <td className="py-2 text-zinc-500 whitespace-nowrap">{formatDate(row.archivedAt)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ── Audit-logs result table ─────────────────────────────────────────────────

export interface AuditLogsTableProps { rows: ArchivedAuditLog[] }

export function AuditLogsTable({ rows }: AuditLogsTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-zinc-500 border-b border-zinc-800">
                        <th className="pb-2 text-left font-medium">Date</th>
                        <th className="pb-2 text-left font-medium">Action</th>
                        <th className="pb-2 text-left font-medium">Entity</th>
                        <th className="pb-2 text-left font-medium">Entity ID</th>
                        <th className="pb-2 text-left font-medium">Reason</th>
                        <th className="pb-2 text-left font-medium">Archived</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                    {rows.map((row) => (
                        <tr key={row.id} className="text-zinc-300">
                            <td className="py-2 pr-4 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                            <td className="py-2 pr-4 font-mono text-blue-400 uppercase text-[10px]">{row.actionType}</td>
                            <td className="py-2 pr-4 text-zinc-400">{row.entityType}</td>
                            <td className="py-2 pr-4 font-mono text-zinc-500 truncate max-w-[96px]">{row.entityId}</td>
                            <td className="py-2 pr-4 text-zinc-500 truncate max-w-[160px]">{row.reason ?? '—'}</td>
                            <td className="py-2 text-zinc-500 whitespace-nowrap">{formatDate(row.archivedAt)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
