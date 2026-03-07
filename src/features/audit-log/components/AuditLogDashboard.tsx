'use client'
// EPIC 12 — Audit Logs & Compliance  US-12.1

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { ChevronLeft, ChevronRight, Download, Loader2, ShieldAlert } from 'lucide-react'
import { AuditLogFilters } from './AuditLogFilters'
import { AuditLogTable } from './AuditLogTable'
import { getAuditLogsAction, type AuditLogFilterInput } from '../actions/audit-log-actions'
import type { AuditLogPage, AuditLogRecord } from '@/shared/lib/audit'

interface Props {
    initialData: AuditLogPage
    entityTypes: string[]
}

export function AuditLogDashboard({ initialData, entityTypes }: Props) {
    const [data, setData] = useState<AuditLogPage>(initialData)
    const [currentFilter, setCurrentFilter] = useState<AuditLogFilterInput>({ page: 1, pageSize: 50 })
    const [isPending, startTransition] = useTransition()

    async function fetchPage(filter: AuditLogFilterInput) {
        setCurrentFilter(filter)
        startTransition(async () => {
            const res = await getAuditLogsAction(filter)
            if (res.success && res.data) setData(res.data)
        })
    }

    function handleSearch(filter: AuditLogFilterInput) {
        fetchPage({ ...filter, page: 1 })
    }

    function handlePageChange(newPage: number) {
        fetchPage({ ...currentFilter, page: newPage })
    }

    function exportCSV() {
        const headers = ['timestamp', 'user', 'role', 'action', 'entity_type', 'entity_id', 'reason', 'changes']
        const csvRows = data.rows.map((r: AuditLogRecord) => [
            new Date(r.created_at).toISOString(),
            r.performed_by_username ?? '',
            r.performed_by_role ?? '',
            r.action_type,
            r.entity_type,
            r.entity_id,
            r.reason ?? '',
            JSON.stringify(r.changes ?? {}),
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        const csv = [headers.join(','), ...csvRows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
    const from = (data.page - 1) * data.pageSize + 1
    const to = Math.min(data.page * data.pageSize, data.total)

    return (
        <div className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-900/20 border border-amber-900/40 rounded-lg">
                                <ShieldAlert className="h-5 w-5 text-amber-400" />
                            </div>
                            <div>
                                <CardTitle className="text-xl text-white">Audit Log</CardTitle>
                                <p className="text-sm text-zinc-400 mt-0.5">
                                    {data.total.toLocaleString()} total entr{data.total !== 1 ? 'ies' : 'y'}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            onClick={exportCSV}
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-9"
                        >
                            <Download className="h-4 w-4 mr-1" />
                            Export CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    <AuditLogFilters
                        entityTypes={entityTypes}
                        onSearch={handleSearch}
                        isPending={isPending}
                    />

                    {isPending ? (
                        <div className="flex items-center justify-center py-16 gap-3 text-zinc-400">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading…
                        </div>
                    ) : (
                        <AuditLogTable rows={data.rows} />
                    )}

                    {/* Pagination */}
                    {data.total > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                            <p className="text-sm text-zinc-400">
                                Showing {from}–{to} of {data.total.toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(data.page - 1)}
                                    disabled={data.page <= 1 || isPending}
                                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-zinc-300 px-2">
                                    Page {data.page} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(data.page + 1)}
                                    disabled={data.page >= totalPages || isPending}
                                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
