'use client'
// Import Results Panel — displays a summary of successful/failed rows after CSV import
// US-11.5: Historical data import results view

import { CheckCircle, AlertTriangle } from 'lucide-react'

interface ImportError {
    row: number
    bed_number?: string
    error: string
}

export interface ImportResult {
    total: number
    imported: number
    failed: number
    errors: ImportError[]
}

interface Props {
    result: ImportResult
}

export function ImportResultsPanel({ result }: Props) {
    return (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">Import Results</h2>

            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-zinc-800 px-3 py-3 text-center">
                    <p className="text-2xl font-bold text-white">{result.total.toLocaleString()}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Total rows</p>
                </div>
                <div className="rounded-lg bg-green-900/20 border border-green-700/30 px-3 py-3 text-center">
                    <p className="text-2xl font-bold text-green-400">{result.imported.toLocaleString()}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Imported</p>
                </div>
                <div className={`rounded-lg px-3 py-3 text-center ${
                    result.failed > 0
                        ? 'bg-red-900/20 border border-red-700/30'
                        : 'bg-zinc-800'
                }`}>
                    <p className={`text-2xl font-bold ${result.failed > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                        {result.failed.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">Failed</p>
                </div>
            </div>

            {result.failed === 0 && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    All rows imported successfully.
                </div>
            )}

            {result.errors.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-amber-400">
                        <AlertTriangle className="h-4 w-4" />
                        {result.failed > 100
                            ? `Showing first 100 of ${result.failed} errors:`
                            : `Row errors (${result.errors.length}):`
                        }
                    </div>
                    <div className="rounded-lg bg-zinc-800 overflow-auto max-h-64">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-zinc-700">
                                    <th className="px-3 py-2 text-zinc-400 text-left font-medium">Row #</th>
                                    <th className="px-3 py-2 text-zinc-400 text-left font-medium">Bed</th>
                                    <th className="px-3 py-2 text-zinc-400 text-left font-medium">Error</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700/50">
                                {result.errors.map((e, i) => (
                                    <tr key={i}>
                                        <td className="px-3 py-1.5 text-zinc-400">{e.row}</td>
                                        <td className="px-3 py-1.5 text-zinc-400">{e.bed_number ?? '—'}</td>
                                        <td className="px-3 py-1.5 text-red-400">{e.error}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
