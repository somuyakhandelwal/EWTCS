'use client'
// Archive Viewer Component
// US-14.3: Search and display historical archived bed stage log data

import { useState, useTransition } from 'react'
import { Search, RefreshCw, Download } from 'lucide-react'
import { searchArchiveAction } from '../actions/retention-actions'
import type { ArchivePage, ArchiveRow } from '../lib/retention-queries'

interface BedOption { id: string; bedNumber: string; wardName: string | null }

interface ArchiveViewerProps {
    initialData: ArchivePage
    beds: BedOption[]
}

function fmtDuration(ms: number | null): string {
    if (ms == null) return '—'
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
}

function fmtTs(iso: string): string {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function downloadCSV(rows: ArchiveRow[]) {
    const header = 'Timestamp,Bed,Ward,From Stage,To Stage,Duration,Notes'
    const body = rows.map((r) =>
        [
            fmtTs(r.transitionTime),
            r.bedNumber,
            r.wardName ?? '',
            r.fromStage ?? '',
            r.toStage ?? '',
            fmtDuration(r.durationMs),
            (r.notes ?? '').replace(/,/g, ';'),
        ].join(',')
    )
    const csv  = [header, ...body].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `archive_export_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export function ArchiveViewer({ initialData, beds }: ArchiveViewerProps) {
    const [data,    setData]    = useState<ArchivePage>(initialData)
    const [startDate, setStartDate] = useState('')
    const [endDate,   setEndDate]   = useState('')
    const [bedId,     setBedId]     = useState('')
    const [error,   setError]   = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function buildFilter(overrides?: { page?: number }) {
        return {
            startDate: startDate || undefined,
            endDate:   endDate   || undefined,
            bedId:     bedId     || undefined,
            page:      overrides?.page ?? 1,
            pageSize:  data.pageSize,
        }
    }

    function handleSearch() {
        setError(null)
        startTransition(async () => {
            const result = await searchArchiveAction(buildFilter())
            if (result.success && result.data) setData(result.data)
            else setError(result.error ?? 'Search failed')
        })
    }

    function handlePage(newPage: number) {
        setError(null)
        startTransition(async () => {
            const result = await searchArchiveAction(buildFilter({ page: newPage }))
            if (result.success && result.data) setData(result.data)
            else setError(result.error ?? 'Page load failed')
        })
    }

    const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                <div className="flex flex-col gap-1 min-w-[140px]">
                    <label className="text-xs text-zinc-400">From date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-200 text-sm px-2 py-1
                                   focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex flex-col gap-1 min-w-[140px]">
                    <label className="text-xs text-zinc-400">To date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-200 text-sm px-2 py-1
                                   focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex flex-col gap-1 min-w-[160px]">
                    <label className="text-xs text-zinc-400">Bed</label>
                    <select
                        value={bedId}
                        onChange={(e) => setBedId(e.target.value)}
                        className="rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-200 text-sm px-2 py-1
                                   focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All beds</option>
                        {beds.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.bedNumber}{b.wardName ? ` (${b.wardName})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={isPending}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600
                               disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                    <Search className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
                    {isPending ? 'Searching…' : 'Search'}
                </button>
                <div className="flex-1" />
                <button
                    type="button"
                    onClick={() => downloadCSV(data.rows)}
                    disabled={data.rows.length === 0}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-600 bg-zinc-800
                               hover:bg-zinc-700 text-zinc-200 text-sm disabled:opacity-40 transition-colors"
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </button>
            </div>

            {error && (
                <p className="rounded-md bg-red-900/30 border border-red-700 px-3 py-2 text-sm text-red-300">
                    {error}
                </p>
            )}

            {/* Results */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
                <div className="p-3 border-b border-zinc-700 flex items-center justify-between">
                    <span className="text-sm text-zinc-400">
                        {data.total.toLocaleString()} archived record{data.total !== 1 ? 's' : ''}
                        {data.total > 0 && ` · page ${data.page} of ${totalPages}`}
                    </span>
                    {isPending && <RefreshCw className="h-4 w-4 text-zinc-500 animate-spin" />}
                </div>

                {data.rows.length === 0 ? (
                    <p className="p-8 text-center text-zinc-500 text-sm">
                        No archived records found for the selected filters.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-700 text-left">
                                    <th className="px-3 py-2 text-xs text-zinc-400 font-medium">Timestamp</th>
                                    <th className="px-3 py-2 text-xs text-zinc-400 font-medium">Bed</th>
                                    <th className="px-3 py-2 text-xs text-zinc-400 font-medium">Ward</th>
                                    <th className="px-3 py-2 text-xs text-zinc-400 font-medium">From Stage</th>
                                    <th className="px-3 py-2 text-xs text-zinc-400 font-medium">To Stage</th>
                                    <th className="px-3 py-2 text-xs text-zinc-400 font-medium">Duration</th>
                                    <th className="px-3 py-2 text-xs text-zinc-400 font-medium">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {data.rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">
                                            {fmtTs(row.transitionTime)}
                                        </td>
                                        <td className="px-3 py-2 text-zinc-200 font-medium whitespace-nowrap">
                                            {row.bedNumber}
                                        </td>
                                        <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">
                                            {row.wardName ?? '—'}
                                        </td>
                                        <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">
                                            {row.fromStage ?? '—'}
                                        </td>
                                        <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">
                                            {row.toStage ?? '—'}
                                        </td>
                                        <td className="px-3 py-2 text-zinc-400 whitespace-nowrap tabular-nums">
                                            {fmtDuration(row.durationMs)}
                                        </td>
                                        <td className="px-3 py-2 text-zinc-500 max-w-[220px] truncate">
                                            {row.notes ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-3 border-t border-zinc-700 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handlePage(data.page - 1)}
                            disabled={data.page <= 1 || isPending}
                            className="px-3 py-1 rounded-lg border border-zinc-600 text-zinc-300 text-sm
                                       hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-xs text-zinc-500">
                            {data.page} / {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => handlePage(data.page + 1)}
                            disabled={data.page >= totalPages || isPending}
                            className="px-3 py-1 rounded-lg border border-zinc-600 text-zinc-300 text-sm
                                       hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
