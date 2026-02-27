'use client'

import { Badge } from '@/shared/components/ui/badge'
import { User } from 'lucide-react'
import type { CorrectionAuditRecord } from '../types/corrections'

interface Props {
    records: CorrectionAuditRecord[]
    loading: boolean
}

export function CorrectionAuditTrailTable({ records, loading }: Props) {
    return (
        <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
                <thead className="bg-card border-b border-border">
                    <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Approver</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bed #</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Original</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Corrected</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {records.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                                {loading ? 'Loading records...' : 'No correction records found.'}
                            </td>
                        </tr>
                    ) : (
                        records.map(record => {
                            const stageCorrection = record.correctedFields?.['to_stage_id'];
                            const notesCorrection = record.correctedFields?.['notes'];

                            return (
                                <tr key={record.id} className="hover:bg-muted transition-colors">
                                    <td className="px-4 py-3 text-card-foreground whitespace-nowrap">
                                        {new Date(record.correctedAt).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-card-foreground">
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center gap-2">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                                {record.correctedByUsername}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-amber-500">{record.bedNumber}</td>
                                    <td className="px-4 py-3 space-y-1">
                                        <div className="text-card-foreground font-medium">
                                            {record.originalToStageName}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-mono">
                                            ID: {record.originalToStageId}
                                        </div>
                                        {notesCorrection && (
                                            <div className="text-[10px] text-muted-foreground italic">
                                                Note: {record.originalNotes || 'EMPTY'}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 space-y-2">
                                        {stageCorrection ? (
                                            <div>
                                                <div className="text-amber-400 font-semibold text-sm">
                                                    {record.correctedToStageName || (typeof stageCorrection.to === 'object' && stageCorrection.to !== null ? (stageCorrection.to as Record<string, unknown>).name as string : 'Unknown')}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                                    StageId: {typeof stageCorrection.to === 'object' && stageCorrection.to !== null ? (stageCorrection.to as Record<string, unknown>).id as string : String(stageCorrection.to)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-zinc-600 text-xs italic">—</div>
                                        )}

                                        <div className="flex flex-wrap gap-1">
                                            {Object.keys(record.correctedFields).map(f => {
                                                if (f === 'to_stage_id') return null;
                                                const val = record.correctedFields[f].to;
                                                return (
                                                    <Badge key={f} variant="outline" className="text-[9px] border-border text-muted-foreground py-0">
                                                        {f.replace(/_/g, ' ')}: {String(val)}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground italic text-xs max-w-xs truncate">
                                        {record.correctionReason}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    )
}
