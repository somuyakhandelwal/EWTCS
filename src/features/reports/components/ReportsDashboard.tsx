'use client'
// Management Reports Dashboard
// EPIC 10: US-10.1–US-10.7 — interactive report with date range filter and CSV export.
// EPIC 11: US-11.1 (PDF via print), US-11.4 (print-friendly layout)

import { useState, useTransition, useCallback } from 'react'
import { Download, RefreshCw, Printer } from 'lucide-react'
import { getReportDataAction, exportReportCSVAction } from '../actions/report-actions'
import { SignOffPanel } from './SignOffPanel'
import { ReportsSectionContent } from './ReportsSectionContent'
import type { ReportData } from '../types/report'
import type { ReportFilterInput } from '../schemas/report-schemas'
import type { SignOff } from '../lib/sign-off-queries'

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'trend',    label: 'Trends' },
  { id: 'stages',   label: 'Stage Delays' },
  { id: 'beds',     label: 'Bed Performance' },
  { id: 'heatmap',  label: 'Activity Heatmap' },
]

interface ReportsDashboardProps {
  initialData: ReportData
  initialFilter: ReportFilterInput
  initialSignOff?: SignOff | null
  canSignOff?: boolean
}

export function ReportsDashboard({ initialData, initialFilter, initialSignOff, canSignOff = false }: ReportsDashboardProps) {
  const [data,       setData]       = useState<ReportData>(initialData)
  const [filter,     setFilter]     = useState<ReportFilterInput>(initialFilter)
  const [activeTab,  setActiveTab]  = useState('overview')
  const [error,      setError]      = useState<string | null>(null)
  const [exporting,  setExporting]  = useState(false)
  const [isPending,  startTransition] = useTransition()

  const applyFilter = useCallback((newFilter: ReportFilterInput) => {
    setFilter(newFilter)
    setError(null)
    startTransition(async () => {
      const result = await getReportDataAction(newFilter)
      if (result.success && result.data) {
        setData(result.data)
      } else {
        setError(result.error ?? 'Failed to load data')
      }
    })
  }, [])

  async function handleExportCSV() {
    setExporting(true)
    const result = await exportReportCSVAction(filter)
    if (result.success && result.csv) {
      const blob = new Blob([result.csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = result.filename ?? 'report.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
    setExporting(false)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Toolbar — hidden in print mode (US-11.4) */}
      <div className="no-print flex flex-wrap items-end gap-4">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400 whitespace-nowrap">From</label>
          <input
            type="date"
            defaultValue={filter.startDate ?? ''}
            onChange={(e) => setFilter((f) => ({ ...f, startDate: e.target.value || undefined }))}
            className="rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-200 text-sm px-2 py-1
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="text-xs text-zinc-400">To</label>
          <input
            type="date"
            defaultValue={filter.endDate ?? ''}
            onChange={(e) => setFilter((f) => ({ ...f, endDate: e.target.value || undefined }))}
            className="rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-200 text-sm px-2 py-1
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={() => applyFilter(filter)}
          disabled={isPending}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600
                     disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? 'Loading…' : 'Apply'}
        </button>
        <div className="flex-1" />
        {/* Print / Save PDF (US-11.1, US-11.4) */}
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-600 bg-zinc-800
                     hover:bg-zinc-700 text-zinc-200 text-sm transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </button>
        {/* CSV export */}
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={exporting}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-600 bg-zinc-800
                     hover:bg-zinc-700 text-zinc-200 text-sm transition-colors disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {error && (
        <p className="no-print rounded-md bg-red-900/30 border border-red-700 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Section tabs — hidden in print mode; all sections render always for print (US-11.4) */}
      <div className="no-print flex gap-1 border-b border-zinc-800 pb-0">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveTab(s.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === s.id
                ? 'text-white border border-b-zinc-900 border-zinc-700 bg-zinc-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/*
        Each section is always in the DOM so print/PDF captures everything.
        Screen: inactive sections get `hidden` via inline style.
        Print: `.print-section` overrides `display:none` with `display:block`.
      */}
      <ReportsSectionContent data={data} activeTab={activeTab} />

      {/* US-12.4: Supervisor sign-off (hidden in print) */}
      <SignOffPanel
        reportDate={filter.endDate ?? new Date().toISOString().slice(0, 10)}
        initialSignOff={initialSignOff}
        canSignOff={canSignOff}
      />
    </div>
  )
}
