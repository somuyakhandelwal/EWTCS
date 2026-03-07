'use client'
// Historical CSV Import Form
// US-11.5: Import historical data from existing systems

import { useState, useRef } from 'react'
import { Upload, Download, XCircle } from 'lucide-react'
import { ImportResultsPanel, type ImportResult } from './ImportResultsPanel'

const CSV_TEMPLATE = `bed_number,from_stage,to_stage,transition_time,duration_seconds,notes
ER-01,Triage,Registration,2024-01-15T10:30:00Z,1800,Historical import
ER-02,,Triage,2024-01-15T08:00:00Z,,
`

function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export function HistoricalImportForm() {
    const fileRef  = useRef<HTMLInputElement>(null)
    const [file,   setFile]   = useState<File | null>(null)
    const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
    const [result, setResult] = useState<ImportResult | null>(null)
    const [serverError, setServerError] = useState<string | null>(null)

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0] ?? null
        setFile(f)
        setStatus('idle')
        setResult(null)
        setServerError(null)
    }

    async function handleUpload() {
        if (!file) return
        setStatus('uploading')
        setServerError(null)

        const fd = new FormData()
        fd.append('file', file)

        try {
            const res  = await fetch('/api/import/historical', { method: 'POST', body: fd })
            const body = await res.json()

            if (!res.ok) {
                setServerError(body.error ?? `HTTP ${res.status}`)
                setStatus('error')
                return
            }

            setResult(body as ImportResult)
            setStatus('done')
        } catch {
            setServerError('Network error — please try again')
            setStatus('error')
        }
    }

    return (
        <div className="space-y-6">
            {/* Instructions */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-3">
                <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">CSV Format</h2>
                <p className="text-sm text-zinc-400">
                    Upload a CSV file with historical bed stage transition records. Required columns:
                    <code className="mx-1 bg-zinc-800 px-1 rounded text-zinc-300">bed_number</code>,
                    <code className="mx-1 bg-zinc-800 px-1 rounded text-zinc-300">to_stage</code>,
                    <code className="mx-1 bg-zinc-800 px-1 rounded text-zinc-300">transition_time</code>.
                    Optional:
                    <code className="mx-1 bg-zinc-800 px-1 rounded text-zinc-300">from_stage</code>,
                    <code className="mx-1 bg-zinc-800 px-1 rounded text-zinc-300">duration_seconds</code>,
                    <code className="mx-1 bg-zinc-800 px-1 rounded text-zinc-300">notes</code>.
                </p>
                <ul className="text-xs text-zinc-500 list-disc list-inside space-y-0.5">
                    <li>Bed numbers must match existing active beds (e.g. ER-01)</li>
                    <li>Stage names must match existing active stages</li>
                    <li>transition_time must be an ISO 8601 timestamp</li>
                    <li>duration_seconds is the time spent in the previous stage</li>
                    <li>Data is imported into the archive table (historical records)</li>
                    <li>Max 10,000 rows per import · Max 10 MB file size</li>
                </ul>
                <button
                    type="button"
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                    <Download className="h-4 w-4" />
                    Download CSV template
                </button>
            </div>

            {/* Upload form */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
                <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">Upload File</h2>

                <div
                    className="border-2 border-dashed border-zinc-600 hover:border-blue-500 rounded-lg p-8 text-center
                               cursor-pointer transition-colors"
                    onClick={() => fileRef.current?.click()}
                >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-zinc-500" />
                    <p className="text-sm text-zinc-400">
                        {file ? (
                            <span className="text-zinc-200 font-medium">{file.name}</span>
                        ) : (
                            <>Click to choose a CSV file</>
                        )}
                    </p>
                    {file && (
                        <p className="text-xs text-zinc-500 mt-1">
                            {(file.size / 1024).toFixed(1)} KB
                        </p>
                    )}
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {serverError && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-900/20 border border-red-700/40 px-3 py-2">
                        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                        <p className="text-sm text-red-300">{serverError}</p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!file || status === 'uploading'}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600
                               disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                    <Upload className="h-4 w-4" />
                    {status === 'uploading' ? 'Importing…' : 'Import Data'}
                </button>
            </div>

            {/* Results */}
            {status === 'done' && result && <ImportResultsPanel result={result} />}
        </div>
    )
}
