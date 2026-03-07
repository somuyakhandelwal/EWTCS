'use client'
// EPIC 12 — Audit Logs & Compliance  US-12.2
// Stage change history — filterable, paginated, exportable

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { ChevronLeft, ChevronRight, Download, Loader2, History, Search, RotateCcw } from 'lucide-react'
import type { StageHistoryPage, StageHistoryRow, BedOption, StageOption, StageHistoryFilter } from '../lib/stage-history-queries'

const selectCls = 'h-9 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm px-2 focus:outline-none focus:ring-2 focus:ring-blue-500'

function fmtDuration(ms: number | null) {
    if (!ms || ms < 0) return '—'
    const min = Math.round(ms / 60000)
    if (min < 60) return `${min}m`
    return `${Math.floor(min / 60)}h ${min % 60}m`
}

interface Props {
    initialData: StageHistoryPage
    beds: BedOption[]
    stages: StageOption[]
    onFetch: (filter: StageHistoryFilter) => Promise<StageHistoryPage | null>
}

export function StageHistoryDashboard({ initialData, beds, stages, onFetch }: Props) {
    const [data, setData] = useState<StageHistoryPage>(initialData)
    const [activeFilter, setActiveFilter] = useState<StageHistoryFilter>({ page: 1, pageSize: 50 })
    const [bedId, setBedId] = useState('')
    const [stageId, setStageId] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isPending, startTransition] = useTransition()

    function buildFilter(page = 1): StageHistoryFilter {
        return {
            bedId: bedId || undefined,
            stageId: stageId || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            page,
            pageSize: 50,
        }
    }

    async function fetchData(filter: StageHistoryFilter) {
        setActiveFilter(filter)
        startTransition(async () => {
            const result = await onFetch(filter)
            if (result) setData(result)
        })
    }

    function handleSearch() { fetchData(buildFilter(1)) }

    function handleReset() {
        setBedId(''); setStageId(''); setStartDate(''); setEndDate('')
        fetchData({ page: 1, pageSize: 50 })
    }

    function exportCSV() {
        const headers = ['timestamp', 'bed', 'ward', 'from_stage', 'to_stage', 'duration_prev', 'user', 'role', 'shift', 'notes']
        const csvRows = data.rows.map((r: StageHistoryRow) => [
            new Date(r.transition_time).toISOString(),
            r.bed_number,
            r.ward_name,
            r.from_stage ?? '',
            r.to_stage,
            fmtDuration(r.duration_prev_ms),
            r.changed_by_username ?? '',
            r.changed_by_role ?? '',
            r.shift_name ?? '',
            r.notes ?? '',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        const csv = [headers.join(','), ...csvRows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `stage-history-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
    const from = (data.page - 1) * data.pageSize + 1
    const to = Math.min(data.page * data.pageSize, data.total)

    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-900/20 border border-blue-900/40 rounded-lg">
                            <History className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <CardTitle className="text-xl text-white">Stage Change History</CardTitle>
                            <p className="text-sm text-zinc-400 mt-0.5">{data.total.toLocaleString()} total transitions</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={exportCSV} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-9">
                        <Download className="h-4 w-4 mr-1" />
                        Export CSV
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-zinc-400">Bed</label>
                        <select value={bedId} onChange={e => setBedId(e.target.value)} className={`${selectCls} w-36`}>
                            <option value="">All beds</option>
                            {beds.map(b => <option key={b.id} value={b.id}>{b.bed_number}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-zinc-400">Stage</label>
                        <select value={stageId} onChange={e => setStageId(e.target.value)} className={`${selectCls} w-36`}>
                            <option value="">All stages</option>
                            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-zinc-400">From</label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                            className="w-36 bg-zinc-800 border-zinc-700 text-zinc-200 h-9" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-zinc-400">To</label>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                            className="w-36 bg-zinc-800 border-zinc-700 text-zinc-200 h-9" />
                    </div>
                    <Button onClick={handleSearch} disabled={isPending} className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
                        <Search className="h-4 w-4 mr-1" />Search
                    </Button>
                    <Button variant="outline" onClick={handleReset} disabled={isPending} className="h-9 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                        <RotateCcw className="h-4 w-4 mr-1" />Reset
                    </Button>
                </div>

                {isPending ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-zinc-400">
                        <Loader2 className="h-5 w-5 animate-spin" />Loading…
                    </div>
                ) : data.rows.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">No stage transitions match the current filter.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                                    <th className="pb-3 text-left font-medium pr-4">Timestamp</th>
                                    <th className="pb-3 text-left font-medium pr-4">Bed</th>
                                    <th className="pb-3 text-left font-medium pr-4">From Stage</th>
                                    <th className="pb-3 text-left font-medium pr-4">To Stage</th>
                                    <th className="pb-3 text-left font-medium pr-4">Duration</th>
                                    <th className="pb-3 text-left font-medium pr-4">User</th>
                                    <th className="pb-3 text-left font-medium pr-4">Shift</th>
                                    <th className="pb-3 text-left font-medium">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {data.rows.map(row => (
                                    <tr key={row.id} className="hover:bg-zinc-800/20 transition-colors">
                                        <td className="py-3 pr-4 text-zinc-300 whitespace-nowrap text-xs">
                                            {new Date(row.transition_time).toLocaleString('en-US', {
                                                year: 'numeric', month: 'short', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </td>
                                        <td className="py-3 pr-4 text-white font-medium">{row.bed_number}</td>
                                        <td className="py-3 pr-4 text-zinc-400 text-xs">
                                            {row.from_stage ?? <span className="italic text-zinc-600">—</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-blue-300 font-medium text-xs">{row.to_stage}</td>
                                        <td className="py-3 pr-4 text-zinc-400 text-xs">{fmtDuration(row.duration_prev_ms)}</td>
                                        <td className="py-3 pr-4">
                                            <div className="text-zinc-200 text-xs">{row.changed_by_username ?? '—'}</div>
                                            {row.changed_by_role && <div className="text-zinc-500 text-xs capitalize">{row.changed_by_role}</div>}
                                        </td>
                                        <td className="py-3 pr-4 text-zinc-400 text-xs">{row.shift_name ?? '—'}</td>
                                        <td className="py-3 text-zinc-500 text-xs max-w-[160px] truncate" title={row.notes ?? ''}>
                                            {row.notes ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {data.total > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                        <p className="text-sm text-zinc-400">Showing {from}–{to} of {data.total.toLocaleString()}</p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => fetchData({ ...activeFilter, page: data.page - 1 })}
                                disabled={data.page <= 1 || isPending} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-zinc-300 px-2">Page {data.page} / {totalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => fetchData({ ...activeFilter, page: data.page + 1 })}
                                disabled={data.page >= totalPages || isPending} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
