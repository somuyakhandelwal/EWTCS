'use client'

/**
 * EPIC 7 / Auditor History — Table sub-component.
 * Extracted from AuditorHistoryView to keep each file under 200 lines.
 *
 * Props:
 *   showCorrections  — show Corrected badges + corrected stage names (no Edit button)
 *   canEdit          — show Edit button (implies showCorrections)
 *   canOverrideShift — show Shift column with inline override selector (US-8.2 AC-4)
 *   shifts           — list of active shifts for the override selector
 *   onOverrideShift  — callback when supervisor changes a log's shift
 */

import { useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Pencil } from 'lucide-react'
import type { AuditorHistoryRecord, AuditorHistorySortBy } from '../lib/auditor-history-queries'
import type { Shift } from '@/shared/types/shift.types'

// ---------------------------------------------------------------------------
// ShiftCell — inline shift label + override selector (US-8.2 AC-4)
// ---------------------------------------------------------------------------
function ShiftCell({
  logId, shiftId, shiftName, shifts, onOverride,
}: {
  logId: string
  shiftId: string | null
  shiftName: string | null
  shifts: Shift[]
  onOverride: (logId: string, shiftId: string) => Promise<void>
}) {
  const [editing, setEditing]   = useState(false)
  const [saving,  setSaving]    = useState(false)

  const handleChange = async (newShiftId: string) => {
    setSaving(true)
    await onOverride(logId, newShiftId)
    setSaving(false)
    setEditing(false)
  }

  if (!editing) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{shiftName ?? '—'}</span>
        <button
          onClick={() => setEditing(true)}
          title="Override shift for this log entry"
          className="text-blue-400 hover:text-blue-300 border border-blue-700/40 hover:border-blue-500/60 bg-blue-950/20 hover:bg-blue-950/40 rounded p-0.5 transition-colors"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </span>
    )
  }

  return (
    <select
      autoFocus
      defaultValue={shiftId ?? ''}
      disabled={saving}
      onBlur={() => setEditing(false)}
      onChange={e => { void handleChange(e.target.value) }}
      className="text-xs rounded border border-border bg-card text-foreground px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">— No shift —</option>
      {shifts.map(s => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  )
}

// ---------------------------------------------------------------------------
// AuditorHistoryTable
// ---------------------------------------------------------------------------
interface AuditorHistoryTableProps {
  rows: AuditorHistoryRecord[]
  loading: boolean
  correctedLogIds: Set<string>
  correctedStageMap: Record<string, string>
  showCorrections: boolean
  canEdit: boolean
  /** US-8.2 AC-4: show Shift column with inline override (supervisor / admin) */
  canOverrideShift?: boolean
  /** US-8.2 AC-4: active shifts for the override selector */
  shifts?: Shift[]
  /** US-8.2 AC-4: called when supervisor reassigns a shift */
  onOverrideShift?: (logId: string, shiftId: string) => Promise<void>
  sortBy: AuditorHistorySortBy
  sortOrder: 'asc' | 'desc'
  onSort: (col: AuditorHistorySortBy) => void
  onEdit: (row: AuditorHistoryRecord) => void
}

export function AuditorHistoryTable({
  rows, loading, correctedLogIds, correctedStageMap,
  showCorrections, canEdit,
  canOverrideShift = false, shifts = [], onOverrideShift,
  sortBy, sortOrder, onSort, onEdit,
}: AuditorHistoryTableProps) {
  const marker = (col: AuditorHistorySortBy) =>
    sortBy === col ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''

  const SortTh = ({ col, label }: { col: AuditorHistorySortBy; label: string }) => (
    <th className="p-2">
      <button onClick={() => onSort(col)}>{label}{marker(col)}</button>
    </th>
  )

  const showShiftCol = canOverrideShift && shifts.length > 0
  // base 6 cols + optional Shift col + optional Actions col
  const colCount = 6 + (showShiftCol ? 1 : 0) + (canEdit ? 1 : 0)

  return (
    <div className="overflow-x-auto border border-border rounded-md">
      <table className="w-full text-sm whitespace-nowrap">
        <thead className="bg-card">
          <tr className="text-left text-card-foreground">
            <SortTh col="transitionTime" label="Timestamp" />
            <SortTh col="bedNumber" label="Bed" />
            <th className="p-2">From</th>
            <SortTh col="toStageName" label="To" />
            <th className="p-2">User ID</th>
            <SortTh col="changedByUsername" label="Username" />
            {showShiftCol && <th className="p-2 text-blue-400">Shift</th>}
            {canEdit && <th className="p-2 text-amber-400">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {!loading && rows.length === 0 && (
            <tr>
              <td className="p-3 text-muted-foreground" colSpan={colCount}>
                No history records found.
              </td>
            </tr>
          )}
          {rows.map((row) => {
            const isCorrected = showCorrections && correctedLogIds.has(row.id)
            const correctedStage = correctedStageMap[row.id]
            const displayStageName = correctedStage ?? row.toStageName

            return (
              <tr key={row.id} className="border-t border-border">
                <td className="p-2">{new Date(row.transitionTime).toLocaleString()}</td>
                <td className="p-2">{row.bedNumber}</td>
                <td className="p-2">{row.fromStageName ?? 'Admission'}</td>
                <td className="p-2">
                  <span className="flex items-center gap-2">
                    <span className={isCorrected && correctedStage ? 'text-amber-300' : ''}>
                      {displayStageName}
                    </span>
                    {isCorrected && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-amber-600/60 text-amber-400 bg-amber-950/30 px-1.5 py-0"
                      >
                        Corrected
                      </Badge>
                    )}
                  </span>
                </td>
                <td className="p-2 font-mono text-xs">{row.changedByUserId}</td>
                <td className="p-2">{row.changedByUsername}</td>
                {showShiftCol && (
                  <td className="p-2">
                    <ShiftCell
                      logId={row.id}
                      shiftId={row.shiftId}
                      shiftName={row.shiftName}
                      shifts={shifts}
                      onOverride={onOverrideShift!}
                    />
                  </td>
                )}
                {canEdit && (
                  <td className="p-2">
                    <button
                      onClick={() => onEdit(row)}
                      title="Edit this history record"
                      className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 border border-amber-700/40 hover:border-amber-500/60 bg-amber-950/20 hover:bg-amber-950/40 rounded px-2 py-1 transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
