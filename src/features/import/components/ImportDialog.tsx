'use client'

import * as React from 'react'
import { Upload, AlertCircle, CheckCircle2, FileUp, Loader2, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { parseCSV } from '../lib/csv-parser'
import { importHistoricalDataAction } from '../actions/import-actions'
import type { ImportResult } from '../types/import.types'

export function ImportDialog() {
    const [isOpen, setIsOpen] = React.useState(false)
    const [isUploading, setIsUploading] = React.useState(false)
    const [file, setFile] = React.useState<File | null>(null)
    const [result, setResult] = React.useState<ImportResult | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setResult(null)
            setError(null)
        }
    }

    const [progress, setProgress] = React.useState(0)

    const handleImport = async () => {
        if (!file) return

        setIsUploading(true)
        setError(null)
        setResult(null)
        setProgress(0)

        try {
            const text = await file.text()
            const rows = parseCSV(text)

            if (rows.length === 0) {
                throw new Error('CSV file is empty or malformed')
            }

            const CHUNK_SIZE = 50
            const totalRows = rows.length
            const combinedResult: ImportResult = { successCount: 0, failureCount: 0, errors: [] }

            for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
                const chunk = rows.slice(i, i + CHUNK_SIZE)
                const response = await importHistoricalDataAction(chunk)

                if (response.success && response.result) {
                    combinedResult.successCount += response.result.successCount
                    combinedResult.failureCount += response.result.failureCount
                    combinedResult.errors.push(...response.result.errors)

                    const currentProgress = Math.min(Math.round(((i + chunk.length) / totalRows) * 100), 100)
                    setProgress(currentProgress)
                    setResult({ ...combinedResult }) // Update UI incrementally
                } else {
                    throw new Error(response.error || 'Import failed mid-process')
                }
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred')
        } finally {
            setIsUploading(false)
        }
    }

    if (!isOpen) {
        return (
            <Button variant="outline" onClick={() => setIsOpen(true)} className="flex items-center gap-2 border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                <FileUp className="h-4 w-4" />
                Import History
            </Button>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl w-full max-w-[600px] flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Import Historical Data</h2>
                        <p className="text-sm text-zinc-400 mt-1">
                            Upload a CSV file to import past patient admissions.
                            Required headers: bed_number, admitted_at, discharged_at, discharged_by_username
                        </p>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        disabled={isUploading}
                        className="text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-lg p-12 transition-colors hover:border-zinc-700 bg-black/20">
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            id="csv-upload"
                            onChange={handleFileChange}
                            disabled={isUploading}
                        />
                        <label
                            htmlFor="csv-upload"
                            className="flex flex-col items-center gap-2 cursor-pointer"
                        >
                            <Upload className="h-10 w-10 text-zinc-500" />
                            <span className="text-sm font-medium text-zinc-300">
                                {file ? file.name : "Click to select or drag and drop CSV"}
                            </span>
                            <span className="text-xs text-zinc-500">
                                Max file size: 10MB
                            </span>
                        </label>
                    </div>

                    {isUploading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-zinc-400">
                                <span>Processing data...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-md flex gap-3">
                            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-red-400">Error</h4>
                                <p className="text-sm text-red-400/80">{error}</p>
                            </div>
                        </div>
                    )}

                    {result && (
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
                                <div className="border border-zinc-800 rounded-md overflow-hidden bg-black/40">
                                    <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Error Log</h4>
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
                    )}
                </div>

                <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => setIsOpen(false)}
                        disabled={isUploading}
                        className="text-zinc-400 hover:bg-zinc-800"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!file || isUploading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                    >
                        {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isUploading ? "Importing" : "Start Import"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
