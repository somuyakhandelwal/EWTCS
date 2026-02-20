'use client'
// ExportDialog — EPIC 11 (US-11.1, US-11.2, US-11.3)
// Modal that lets the user choose:
//   • Format: PDF or CSV
//   • Date Range: preset buttons or custom date inputs (default: Last 30 days)
// Then triggers the appropriate export action.
//
// For CSV: calls the server action, then triggers a browser download.
// For PDF: calls the client-side pdf-generator which uses html2canvas + jsPDF.

import { useState, useCallback, useTransition } from 'react'
import { Download, FileText, FileSpreadsheet, X, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { DateRangePicker } from './DateRangePicker'
import type { ExportFormat, ExportScope, ResolvedDateRange, PdfSection } from '../types/export.types'
import {
  exportPatientCountCSV,
  exportDelayedPatientsCSV,
  exportBedPerformanceCSV,
  exportStageDelayCSV,
} from '../actions/export-actions'
import { exportStageTransitionsAsCSV } from '@/features/bed-dashboard/actions/analytics-export-actions'
import { buildFilename } from '../lib/pdf-generator'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const SCOPE_LABELS: Record<ExportScope, string> = {
  full: 'Full Analytics Report',
  patients: 'Patient Count',
  delayed: 'Delayed Patients %',
  beds: 'Bed-Wise Performance',
  stages: 'Stage-Wise Delays',
  transitions: 'Stage Transitions',
}

const SCOPE_FILENAMES: Record<ExportScope, string> = {
  full: 'full-analytics-report',
  patients: 'patient-count',
  delayed: 'delayed-patients',
  beds: 'bed-performance',
  stages: 'stage-delays',
  transitions: 'stage-transitions',
}

// ---------------------------------------------------------------------------
// Format selector card
// ---------------------------------------------------------------------------

function FormatCard({
  format,
  selected,
  onClick,
  disabled,
}: {
  format: ExportFormat
  selected: boolean
  onClick: () => void
  disabled?: boolean
}) {
  const isPdf = format === 'pdf'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border p-4 transition-all',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
        selected
          ? 'border-blue-500 bg-blue-500/10 text-blue-300'
          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {isPdf ? (
        <FileText className="h-8 w-8" />
      ) : (
        <FileSpreadsheet className="h-8 w-8" />
      )}
      <span className="text-sm font-medium">{isPdf ? 'PDF' : 'CSV'}</span>
      <span className="text-xs text-zinc-500">
        {isPdf ? 'With charts & tables' : 'Raw data for Excel'}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// ExportDialog
// ---------------------------------------------------------------------------

export interface ExportDialogProps {
  scope: ExportScope
  /** Section DOM id attributes for PDF capture (per-section or full-report). */
  pdfSections?: PdfSection[]
  /** Title embedded in the PDF header. */
  pdfTitle?: string
  /** Username of the logged-in user for PDF metadata. */
  exportedBy?: string
  /** Optional shift filter to forward to server CSV actions. */
  shiftId?: string
  onClose: () => void
}

export function ExportDialog({
  scope,
  pdfSections = [],
  pdfTitle,
  exportedBy,
  shiftId,
  onClose,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [range, setRange] = useState<ResolvedDateRange | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pdfProgress, setPdfProgress] = useState<string | null>(null)

  const isLoading = isPending || pdfProgress !== null

  const resolvedTitle = pdfTitle ?? SCOPE_LABELS[scope]
  const baseFilename = SCOPE_FILENAMES[scope]

  // ---------------------------------------------------------------------------
  // CSV export
  // ---------------------------------------------------------------------------

  const handleCsvExport = useCallback(
    async (r: ResolvedDateRange) => {
      setError(null)
      const label = r.label
      let result: { success: boolean; data?: string; error?: string }

      if (scope === 'patients') {
        result = await exportPatientCountCSV({
          startDate: r.startDate,
          endDate: r.endDate,
          shiftId: shiftId ?? null,
          rangeLabel: label,
        })
      } else if (scope === 'delayed') {
        result = await exportDelayedPatientsCSV({
          startDate: r.startDate,
          endDate: r.endDate,
          shiftId: shiftId ?? null,
          rangeLabel: label,
        })
      } else if (scope === 'beds') {
        result = await exportBedPerformanceCSV({
          startDate: r.startDate,
          endDate: r.endDate,
          shiftId: shiftId ?? null,
          rangeLabel: label,
        })
      } else if (scope === 'stages') {
        result = await exportStageDelayCSV({
          startDate: r.startDate,
          endDate: r.endDate,
          rangeLabel: label,
        })
      } else if (scope === 'transitions') {
        result = await exportStageTransitionsAsCSV({
          startDate: r.startDate,
          endDate: r.endDate,
        })
      } else {
        // 'full' — export all sections as separate CSV files
        const results = await Promise.all([
          exportPatientCountCSV({ startDate: r.startDate, endDate: r.endDate, rangeLabel: label }),
          exportDelayedPatientsCSV({ startDate: r.startDate, endDate: r.endDate, rangeLabel: label }),
          exportBedPerformanceCSV({ startDate: r.startDate, endDate: r.endDate, rangeLabel: label }),
          exportStageDelayCSV({ startDate: r.startDate, endDate: r.endDate, rangeLabel: label }),
        ])

        const labels = ['patient-count', 'delayed-patients', 'bed-performance', 'stage-delays']
        const failed = results.filter((r) => !r.success)
        if (failed.length > 0) {
          setError(failed[0].error ?? 'Some exports failed')
          return
        }

        results.forEach((r, i) => {
          if (r.data) {
            downloadCsv(r.data, buildFilename(labels[i], range!, 'csv'))
          }
        })
        onClose()
        return
      }

      if (!result.success || !result.data) {
        setError(result.error ?? 'Export failed')
        return
      }

      downloadCsv(result.data, buildFilename(baseFilename, r, 'csv'))
      onClose()
    },
    [scope, shiftId, baseFilename, range, onClose]
  )

  // ---------------------------------------------------------------------------
  // PDF export
  // ---------------------------------------------------------------------------

  const handlePdfExport = useCallback(
    async (r: ResolvedDateRange) => {
      setError(null)
      setPdfProgress('Preparing PDF…')

      try {
        const { generateSectionPDF, generateFullReportPDF } = await import('../lib/pdf-generator')

        const opts = {
          title: resolvedTitle,
          range: r,
          exportedBy: exportedBy ?? 'Hospital Staff',
          baseFilename,
        }

        let result: { success: boolean; error?: string }

        if (scope === 'full' || pdfSections.length > 1) {
          setPdfProgress('Capturing all sections…')
          result = await generateFullReportPDF(pdfSections, opts)
        } else {
          const exportId = pdfSections[0]?.exportId ?? scope
          setPdfProgress(`Capturing section…`)
          result = await generateSectionPDF(exportId, opts)
        }

        setPdfProgress(null)

        if (!result.success) {
          setError(result.error ?? 'PDF generation failed')
          return
        }

        onClose()
      } catch (err) {
        setPdfProgress(null)
        setError(err instanceof Error ? err.message : 'PDF generation failed')
      }
    },
    [scope, pdfSections, resolvedTitle, exportedBy, baseFilename, onClose]
  )

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleExport = useCallback(() => {
    if (!range) return
    if (format === 'csv') {
      startTransition(() => { void handleCsvExport(range) })
    } else {
      void handlePdfExport(range)
    }
  }, [format, range, handleCsvExport, handlePdfExport])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const filenamePreview = range
    ? buildFilename(baseFilename, range, format)
    : `${baseFilename}_…_….${format}`

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Export ${SCOPE_LABELS[scope]}`}
    >
      <Card className="w-full max-w-lg border-zinc-700 bg-zinc-900 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Download className="h-5 w-5 text-blue-400" />
            Export — {SCOPE_LABELS[scope]}
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 p-0"
            aria-label="Close export dialog"
            data-no-export
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Format selection */}
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-300">Format</p>
            <div className="grid grid-cols-2 gap-3">
              <FormatCard format="csv" selected={format === 'csv'} onClick={() => setFormat('csv')} disabled={isLoading} />
              <FormatCard format="pdf" selected={format === 'pdf'} onClick={() => setFormat('pdf')} disabled={isLoading} />
            </div>
          </div>

          {/* Date range */}
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-300">Date Range</p>
            <DateRangePicker
              onChange={setRange}
              defaultPreset="30d"
              disabled={isLoading}
            />
          </div>

          {/* Filename preview */}
          {range && (
            <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
              <p className="text-xs text-zinc-500">File will be saved as:</p>
              <p className="mt-0.5 text-xs font-mono text-zinc-300 truncate">{filenamePreview}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="rounded-md border border-red-800/40 bg-red-950/40 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1" data-no-export>
            <Button variant="outline" onClick={onClose} disabled={isLoading} size="sm">
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isLoading || !range}
              size="sm"
              className="gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {pdfProgress ?? 'Exporting…'}
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Export {format.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
