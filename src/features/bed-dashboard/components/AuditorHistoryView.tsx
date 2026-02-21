'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Download } from 'lucide-react'
import {
  fetchAuditorBedHistory,
  exportAuditorBedHistoryCSV,
} from '../actions/auditor-history-actions'
import type {
  AuditorHistoryRecord,
  AuditorHistorySortBy,
} from '../lib/auditor-history-queries'
import {
  AUDITOR_HISTORY_PAGE_SIZE,
  buildAuditorHistoryPayload,
  DEFAULT_AUDITOR_HISTORY_FILTERS,
} from './auditor-history-view.utils'

export function AuditorHistoryView({ readOnly = false }: { readOnly?: boolean }) {
  const [rows, setRows] = useState<AuditorHistoryRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<AuditorHistorySortBy>('transitionTime')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState({
    ...DEFAULT_AUDITOR_HISTORY_FILTERS,
  })

  const totalPages = Math.max(1, Math.ceil(totalCount / AUDITOR_HISTORY_PAGE_SIZE))

  const buildPayload = useCallback(
    () => buildAuditorHistoryPayload({ filters, page, sortBy, sortOrder }),
    [filters, page, sortBy, sortOrder]
  )

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await fetchAuditorBedHistory(buildPayload())

    if (!result.success || !result.data) {
      setError(result.error ?? 'Failed to load auditor history')
      setRows([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    setRows(result.data.rows)
    setTotalCount(result.data.totalCount)
    setLoading(false)
  }, [buildPayload])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const onSort = (column: AuditorHistorySortBy) => {
    setPage(1)
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(column)
    setSortOrder('asc')
  }

  const sortMarker = useMemo(() => (column: AuditorHistorySortBy) => {
    if (sortBy !== column) return ''
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }, [sortBy, sortOrder])
  const onExport = async () => {
    setExporting(true)
    const result = await exportAuditorBedHistoryCSV({
      bedNumber: filters.bedNumber || undefined,
      stageName: filters.stageName || undefined,
      changedByUserId: filters.changedByUserId || undefined,
      changedByUsername: filters.changedByUsername || undefined,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      sortBy,
      sortOrder,
    })

    if (!result.success || !result.data) {
      setError(result.error ?? 'Failed to export auditor history')
      setExporting(false)
      return
    }

    const blob = new Blob([result.data], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bed-stage-history-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Bed Stage Change History</CardTitle>
            <CardDescription>Read-only audit timeline with filters, sorting, and export.</CardDescription>
          </div>
          <Button size="sm" variant="outline" disabled={exporting || readOnly} onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Filter bed number" value={filters.bedNumber} onChange={(e) => setFilters((prev) => ({ ...prev, bedNumber: e.target.value }))} />
          <Input placeholder="Filter stage name" value={filters.stageName} onChange={(e) => setFilters((prev) => ({ ...prev, stageName: e.target.value }))} />
          <Input placeholder="Filter user ID" value={filters.changedByUserId} onChange={(e) => setFilters((prev) => ({ ...prev, changedByUserId: e.target.value }))} />
          <Input placeholder="Filter username" value={filters.changedByUsername} onChange={(e) => setFilters((prev) => ({ ...prev, changedByUsername: e.target.value }))} />
          <Input type="datetime-local" value={filters.startDate} onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))} />
          <Input type="datetime-local" value={filters.endDate} onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))} />
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setPage(1); void loadHistory() }}>Apply Filters</Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setFilters({ ...DEFAULT_AUDITOR_HISTORY_FILTERS })
              setPage(1)
            }}
          >
            Clear
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto border border-zinc-800 rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900">
              <tr className="text-left text-zinc-300">
                <th className="p-2"><button onClick={() => onSort('transitionTime')}>Timestamp{sortMarker('transitionTime')}</button></th>
                <th className="p-2"><button onClick={() => onSort('bedNumber')}>Bed{sortMarker('bedNumber')}</button></th>
                <th className="p-2">From</th>
                <th className="p-2"><button onClick={() => onSort('toStageName')}>To{sortMarker('toStageName')}</button></th>
                <th className="p-2">User ID</th>
                <th className="p-2"><button onClick={() => onSort('changedByUsername')}>Username{sortMarker('changedByUsername')}</button></th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr><td className="p-3 text-zinc-500" colSpan={6}>No history records found.</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-zinc-800">
                  <td className="p-2">{new Date(row.transitionTime).toLocaleString()}</td>
                  <td className="p-2">{row.bedNumber}</td>
                  <td className="p-2">{row.fromStageName ?? 'Admission'}</td>
                  <td className="p-2">{row.toStageName}</td>
                  <td className="p-2 font-mono">{row.changedByUserId}</td>
                  <td className="p-2">{row.changedByUsername}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">Read-only records. Total: {totalCount}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <span className="text-xs text-zinc-500">Page {page} / {totalPages}</span>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}