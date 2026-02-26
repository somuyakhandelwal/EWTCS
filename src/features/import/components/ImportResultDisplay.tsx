'use client'

import { AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ImportResult } from '../types/import.types'

interface Props {
    result: ImportResult
}

export function ImportResultDisplay({ result }: Props) {
    return (
        <div className="space-y-4">
            <div className={`p-4 rounded-md flex gap-3 ${result.failureCount > 0
                ? "bg-amber-900/20 border border-amber-900/50"
                : "bg-emerald-900/20 border border-emerald-900/50"
                }`}>
                {result.failureCount > 0 ? (
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                )}
                <div>
                    <h4 className={`text-sm font-bold ${result.failureCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                        Import Completed
                    </h4>
                    <p className={`text-sm ${result.failureCount > 0 ? "text-amber-400/80" : "text-emerald-400/80"}`}>
                        Successfully imported {result.successCount} records. {result.failureCount} records failed.
                    </p>
                </div>
            </div>

            {result.errors.length > 0 && (
                <div className="border border-border rounded-md overflow-hidden bg-background">
                    <div className="px-4 py-2 border-b border-border bg-card">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Error Log</h4>
                    </div>
                    <div className="p-4 max-h-[150px] overflow-y-auto font-mono text-xs space-y-1">
                        {result.errors.map((err, idx) => (
                            <div key={idx} className="text-red-400/90">
                                <span className="text-zinc-600">Row {err.row}:</span> {err.error}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
