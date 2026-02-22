import type { ArchivedAdmission } from '../lib/data-retention-types'
import { formatDate, msToHours } from '@/features/data-retention/lib/retention-utils'

interface ArchiveAdmissionsTableProps {
    rows: ArchivedAdmission[]
}

export function ArchiveAdmissionsTable({ rows }: ArchiveAdmissionsTableProps) {
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
