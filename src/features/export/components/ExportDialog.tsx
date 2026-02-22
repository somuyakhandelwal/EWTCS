'use client'
// ExportDialog — EPIC 11 (US-11.1, US-11.2, US-11.3)
// Modal that lets the user choose format and date range.

import { Download, X, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { DateRangePicker } from './DateRangePicker'
import type { ExportDialogProps } from '../types/export.types'
import { buildFilename } from '../lib/pdf-generator'
import { SCOPE_LABELS } from '../lib/export-utils'
import { ExportFormatCard } from './ExportFormatCard'
import { useExportLogic } from '../hooks/useExportLogic'

export function ExportDialog({
  scope,
  pdfSections = [],
  pdfTitle,
  exportedBy,
  shiftId,
  onClose,
}: ExportDialogProps) {
  const {
    format,
    setFormat,
    range,
    setRange,
    error,
    isLoading,
    pdfProgress,
    handleExport,
    baseFilename,
  } = useExportLogic({ scope, pdfSections, pdfTitle, exportedBy, shiftId, onClose })

  const filenamePreview = range
    ? buildFilename(baseFilename, range, format)
    : `${baseFilename}_…_….${format}`

  return (
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
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-300">Format</p>
            <div className="grid grid-cols-2 gap-3">
              <ExportFormatCard format="csv" selected={format === 'csv'} onClick={() => setFormat('csv')} disabled={isLoading} />
              <ExportFormatCard format="pdf" selected={format === 'pdf'} onClick={() => setFormat('pdf')} disabled={isLoading} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-zinc-300">Date Range</p>
            <DateRangePicker
              onChange={setRange}
              defaultPreset="30d"
              disabled={isLoading}
            />
          </div>

          {range && (
            <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
              <p className="text-xs text-zinc-500">File will be saved as:</p>
              <p className="mt-0.5 text-xs font-mono text-zinc-300 truncate">{filenamePreview}</p>
            </div>
          )}

          {error && (
            <p className="rounded-md border border-red-800/40 bg-red-950/40 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

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
