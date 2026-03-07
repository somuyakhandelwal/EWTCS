import type { ArchivedAuditLog } from '../lib/data-retention-types'
import { formatDate } from '@/features/data-retention/lib/retention-utils'

interface ArchiveAuditLogsTableProps {
    rows: ArchivedAuditLog[]
}

export function ArchiveAuditLogsTable({ rows }: ArchiveAuditLogsTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-muted-foreground border-b border-border">
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
                        <tr key={row.id} className="text-card-foreground">
                            <td className="py-2 pr-4 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                            <td className="py-2 pr-4 font-mono text-blue-400 uppercase text-[10px]">{row.actionType}</td>
                            <td className="py-2 pr-4 text-muted-foreground">{row.entityType}</td>
                            <td className="py-2 pr-4 font-mono text-muted-foreground truncate max-w-[96px]">{row.entityId}</td>
                            <td className="py-2 pr-4 text-muted-foreground truncate max-w-[160px]">{row.reason ?? '—'}</td>
                            <td className="py-2 text-muted-foreground whitespace-nowrap">{formatDate(row.archivedAt)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
