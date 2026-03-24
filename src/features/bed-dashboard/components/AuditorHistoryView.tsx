'use client'

/**
 * AuditorHistoryView — EPIC 7: extended with supervisor Edit History (AC 1–5).
 * Sub-components: AuditorHistoryFilters, AuditorHistoryTable, EditHistoryModal.
 *
 * Props:
 *   readOnly        — passed through from parent (no behaviour change here)
 *   canEdit         — shows Edit button + correction modal (supervisor page)
 *   showCorrections — shows Corrected badges + corrected stage names without Edit button
 *                     (analytics page). canEdit=true implies showCorrections.
 */

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Download } from 'lucide-react'
import { fetchAuditorBedHistory, exportAuditorBedHistoryCSV } from '../actions/auditor-history-actions'
import { getCorrectedLogIds, getCorrectedStageMap } from '../actions/stage-history-correction-read-actions'
import { AuditorHistoryFilters } from './AuditorHistoryFilters'
import { AuditorHistoryTable } from './AuditorHistoryTable'
import { EditHistoryModal } from './EditHistoryModal'
import type { AuditorHistoryRecord, AuditorHistorySortBy } from '../lib/auditor-history-queries'
import {
  AUDITOR_HISTORY_PAGE_SIZE,
  buildAuditorHistoryPayload,
  DEFAULT_AUDITOR_HISTORY_FILTERS,
} from './auditor-history-view.utils'
import { getShiftsAction } from '@/features/shift-management/actions/shift-actions'
import { overrideLogShift } from '@/features/shift-management/actions/shift-override-actions'
import type { Shift } from '@/shared/types/shift.types'

interface AuditorHistoryViewProps {
  readOnly?: boolean
  /** Enables Edit button + correction modal. Supervisor page only. */
  canEdit?: boolean
  /** Shows Corrected badges + corrected stage names without Edit button. Analytics page. */
  showCorrections?: boolean
  /** US-8.2 AC-4: Shows inline shift override selector for supervisors / admins. */
  canOverrideShift?: boolean
}

// readOnly: auditors may still export/filter/sort (Export stays enabled; see auditor-history-view-readonly.test)
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- prop part of API, not used to disable Export
export function AuditorHistoryView({ readOnly = false, canEdit = false, showCorrections = false, canOverrideShift = false }: AuditorHistoryViewProps) {
  const shouldFetchCorrections = canEdit || showCorrections

  const [rows, setRows] = useState<AuditorHistoryRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<AuditorHistorySortBy>('transitionTime')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState({ ...DEFAULT_AUDITOR_HISTORY_FILTERS })
  const [correctedLogIds, setCorrectedLogIds] = useState<Set<string>>(new Set())
  const [correctedStageMap, setCorrectedStageMap] = useState<Record<string, string>>({})
  const [editingRecord, setEditingRecord] = useState<AuditorHistoryRecord | null>(null)
  // US-8.2 AC-4: shifts for the inline override selector
  const [shifts, setShifts] = useState<Shift[]>([])

  const totalPages = Math.max(1, Math.ceil(totalCount / AUDITOR_HISTORY_PAGE_SIZE))

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    const payload = buildAuditorHistoryPayload({ filters, page, sortBy, sortOrder })
    const noCorrections = Promise.resolve({ success: true as const, data: [] as string[] })
    const noStageMap = Promise.resolve({ success: true as const, data: {} as Record<string, string> })

    const [historyResult, correctedIdsResult, stageMapResult] = await Promise.all([
      fetchAuditorBedHistory(payload),
      shouldFetchCorrections ? getCorrectedLogIds() : noCorrections,
      shouldFetchCorrections ? getCorrectedStageMap() : noStageMap,
    ])

    if (!historyResult.success || !historyResult.data) {
      setError(historyResult.error ?? 'Failed to load auditor history')
      setRows([]); setTotalCount(0)
    } else {
      setRows(historyResult.data.rows)
      setTotalCount(historyResult.data.totalCount)
    }
    if (correctedIdsResult.success && correctedIdsResult.data) {
      setCorrectedLogIds(new Set(correctedIdsResult.data))
    }
    if (stageMapResult.success && stageMapResult.data) {
      setCorrectedStageMap(stageMapResult.data)
    }
    setLoading(false)
  }, [filters, page, sortBy, sortOrder, shouldFetchCorrections])

  useEffect(() => { void loadHistory() }, [loadHistory])

  // US-8.2 AC-4: fetch shifts once when override is available
  useEffect(() => {
    if (!canOverrideShift) return
    getShiftsAction().then(r => { if (r.success && r.shifts) setShifts(r.shifts) }).catch(() => { })
  }, [canOverrideShift])

  // US-8.2 AC-4: supervisor reassigns the shift on a log entry, then refreshes
  const handleShiftOverride = useCallback(async (logId: string, shiftId: string) => {
    await overrideLogShift({ logId, shiftId })
    void loadHistory()
  }, [loadHistory])

  const onSort = (col: AuditorHistorySortBy) => {
    setPage(1)
    if (sortBy === col) { setSortOrder(p => p === 'asc' ? 'desc' : 'asc'); return }
    setSortBy(col); setSortOrder('asc')
  }

  const onExport = async () => {
    setExporting(true)
    const result = await exportAuditorBedHistoryCSV({
      bedNumber: filters.bedNumber || undefined, stageName: filters.stageName || undefined,
      changedByUserId: filters.changedByUserId || undefined, changedByUsername: filters.changedByUsername || undefined,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      sortBy, sortOrder,
    })
    if (!result.success || !result.data) { setError(result.error ?? 'Failed to export'); setExporting(false); return }
    const blob = new Blob([result.data], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bed-stage-history-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link); link.click()
    document.body.removeChild(link); URL.revokeObjectURL(url)
    setExporting(false)
  }

  const handleCorrectionSaved = (_correctionId: string) => {
    if (!editingRecord) return
    setCorrectedLogIds(prev => new Set([...prev, editingRecord.id]))
    setEditingRecord(null)
    void loadHistory()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Bed Stage Change History</CardTitle>
              <CardDescription>
                {canEdit
                  ? 'Audit timeline with supervisor correction capability.'
                  : 'Read-only audit timeline with filters, sorting, and export.'}
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" disabled={exporting} onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuditorHistoryFilters
            filters={filters} onChange={setFilters}
            onApply={() => { setPage(1); void loadHistory() }}
            onClear={() => { setFilters({ ...DEFAULT_AUDITOR_HISTORY_FILTERS }); setPage(1) }}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <AuditorHistoryTable
            rows={rows} loading={loading}
            correctedLogIds={correctedLogIds}
            correctedStageMap={correctedStageMap}
            canEdit={canEdit}
            showCorrections={shouldFetchCorrections}
            canOverrideShift={canOverrideShift}
            shifts={shifts}
            onOverrideShift={handleShiftOverride}
            sortBy={sortBy} sortOrder={sortOrder}
            onSort={onSort} onEdit={setEditingRecord}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Total: {totalCount}</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {canEdit && editingRecord && (
        <EditHistoryModal
          isOpen={true} onClose={() => setEditingRecord(null)}
          record={editingRecord} onCorrectionSaved={handleCorrectionSaved}
        />
      )}
    </>
  )
}
