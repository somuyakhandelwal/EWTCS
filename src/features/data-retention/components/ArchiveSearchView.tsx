// ArchiveSearchView — date-range search over cold-store archive tables
// EPIC 14 — US-14.3: Auditor Archive Retrieval
//
// Displays results in the same column layout as the active-data tables
// so auditors see a consistent view regardless of which store is queried.

'use client'

import { useState, useTransition } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { searchArchive } from '../actions/archive-search-actions'
import type { ArchivedAdmission, ArchivedAuditLog } from '../lib/data-retention-types'

type TableChoice = 'patient_admissions' | 'audit_logs'

function formatDate(d: Date | string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function msToHours(ms: number): string {
  return (ms / 3_600_000).toFixed(1) + ' h'
}

// ── Sub-tables ─────────────────────────────────────────────────────────────

interface AdmissionsTableProps { rows: ArchivedAdmission[] }

function AdmissionsTable({ rows }: AdmissionsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800">
            <th className="pb-2 text-left font-medium">Admitted</th>
            <th className="pb-2 text-left font-medium">Discharged</th>
            <th className="pb-2 text-right font-medium">Duration</th>
            <th className="pb-2 text-left font-medium">Bed ID</th>
            <th className="pb-2 text-left font-medium">Notes</th>
            <th className="pb-2 text-left font-medium">Archived</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {rows.map((row) => (
            <tr key={row.id} className="text-zinc-300">
              <td className="py-2 pr-4 whitespace-nowrap">{formatDate(row.admittedAt)}</td>
              <td className="py-2 pr-4 whitespace-nowrap">{formatDate(row.dischargedAt)}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{msToHours(row.totalDurationMs)}</td>
              <td className="py-2 pr-4 font-mono text-zinc-400 truncate max-w-[96px]">{row.bedId}</td>
              <td className="py-2 pr-4 text-zinc-500 truncate max-w-[160px]">{row.notes ?? '—'}</td>
              <td className="py-2 text-zinc-500 whitespace-nowrap">{formatDate(row.archivedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface AuditLogsTableProps { rows: ArchivedAuditLog[] }

function AuditLogsTable({ rows }: AuditLogsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800">
            <th className="pb-2 text-left font-medium">Date</th>
            <th className="pb-2 text-left font-medium">Action</th>
            <th className="pb-2 text-left font-medium">Entity</th>
            <th className="pb-2 text-left font-medium">Entity ID</th>
            <th className="pb-2 text-left font-medium">Reason</th>
            <th className="pb-2 text-left font-medium">Archived</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {rows.map((row) => (
            <tr key={row.id} className="text-zinc-300">
              <td className="py-2 pr-4 whitespace-nowrap">{formatDate(row.createdAt)}</td>
              <td className="py-2 pr-4 font-mono text-blue-400 uppercase text-[10px]">{row.actionType}</td>
              <td className="py-2 pr-4 text-zinc-400">{row.entityType}</td>
              <td className="py-2 pr-4 font-mono text-zinc-500 truncate max-w-[96px]">{row.entityId}</td>
              <td className="py-2 pr-4 text-zinc-500 truncate max-w-[160px]">{row.reason ?? '—'}</td>
              <td className="py-2 text-zinc-500 whitespace-nowrap">{formatDate(row.archivedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

interface ArchiveSearchViewProps {
  className?: string
}

export function ArchiveSearchView({ className }: ArchiveSearchViewProps) {
  const today = new Date().toISOString().slice(0, 10)
  const oneYearAgo = new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10)

  const [table, setTable] = useState<TableChoice>('patient_admissions')
  const [from, setFrom] = useState(oneYearAgo)
  const [to, setTo] = useState(today)
  const [results, setResults] = useState<ArchivedAdmission[] | ArchivedAuditLog[] | null>(null)
  const [resultTable, setResultTable] = useState<TableChoice>('patient_admissions')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSearch() {
    setError(null)
    setResults(null)
    startTransition(async () => {
      const result = await searchArchive({ table, from, to })
      if (!result.success || !result.data) {
        setError(result.error ?? 'Search failed.')
        return
      }
      setResults(result.data)
      setResultTable(result.table ?? table)
    })
  }

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white flex items-center gap-2">
          <Search className="h-4 w-4 text-zinc-400" />
          Archive Search
        </CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Retrieve archived records by date range. Results are read-only.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Controls ── */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Table selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Dataset</label>
            <select
              value={table}
              onChange={(e) => setTable(e.target.value as TableChoice)}
              className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              <option value="patient_admissions">Patient Admissions</option>
              <option value="audit_logs">Audit Logs</option>
            </select>
          </div>

          {/* From date */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wide">From</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          {/* To date */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wide">To</label>
            <input
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <Button
            size="sm"
            onClick={handleSearch}
            disabled={isPending || !from || !to}
            className="h-8 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs"
          >
            {isPending
              ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Searching…</>
              : <><Search className="h-3.5 w-3.5 mr-1.5" />Search</>}
          </Button>
        </div>

        {/* ── Error ── */}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {/* ── Results ── */}
        {results !== null && (
          <div>
            <p className="text-[10px] text-zinc-500 mb-2">
              {results.length === 0
                ? 'No archived records found for this date range.'
                : `${results.length.toLocaleString()} record${results.length === 1 ? '' : 's'} found`}
            </p>
            {results.length > 0 && resultTable === 'patient_admissions' && (
              <AdmissionsTable rows={results as ArchivedAdmission[]} />
            )}
            {results.length > 0 && resultTable === 'audit_logs' && (
              <AuditLogsTable rows={results as ArchivedAuditLog[]} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
