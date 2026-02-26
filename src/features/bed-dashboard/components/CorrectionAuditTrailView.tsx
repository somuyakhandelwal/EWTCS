'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { AlertCircle, Download, History } from 'lucide-react'
import {
    searchCorrectionAuditTrail,
    exportCorrectionAuditTrail
} from '../actions/stage-history-correction-read-actions'
import type { CorrectionAuditRecord, CorrectionAuditFilters } from '../types/corrections'
import { CorrectionAuditTrailFilters } from './CorrectionAuditTrailFilters'
import { CorrectionAuditTrailTable } from './CorrectionAuditTrailTable'

interface Props {
    readOnly?: boolean
}

export function CorrectionAuditTrailView({ }: Props) {
    const [filters, setFilters] = useState<CorrectionAuditFilters>({})
    const [records, setRecords] = useState<CorrectionAuditRecord[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchRecords = useCallback(async (currentFilters: CorrectionAuditFilters) => {
        setLoading(true)
        setError(null)
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await searchCorrectionAuditTrail(currentFilters) as any
            if (result.success) {
                setRecords(result.data)
            } else {
                setError(result.error || 'Failed to fetch audit trail')
            }
        } catch {
            setError('An unexpected error occurred while fetching audit trail.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchRecords({})
    }, [fetchRecords])

    const handleSearch = () => fetchRecords(filters)

    const handleExport = async () => {
        try {
            const result = await exportCorrectionAuditTrail(filters)
            if (result.success) {
                const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `correction-audit-${new Date().toISOString().slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(url)
            }
        } catch {
            // Handle error silently or with dedicated UI
        }
    }

    return (
        <Card className="p-6 bg-card border-border space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-amber-500" />
                    <h2 className="text-xl font-bold text-foreground">Correction Audit Trail</h2>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={loading || records.length === 0}
                    className="gap-2 text-xs"
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            <CorrectionAuditTrailFilters
                filters={filters}
                setFilters={setFilters}
                handleSearch={handleSearch}
                loading={loading}
            />

            {error && (
                <div className="p-3 bg-red-900/20 border border-red-800 rounded-md flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            <CorrectionAuditTrailTable records={records} loading={loading} />
        </Card>
    )
}
