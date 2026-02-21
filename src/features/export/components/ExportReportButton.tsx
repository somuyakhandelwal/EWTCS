'use client'
// ExportReportButton — EPIC 11 (US-11.1, US-11.2, US-11.3)
// A single button that opens the ExportDialog.
// Drop-in replacement for the old inline CSV download buttons and the new
// PDF export entry points. Works at both per-section and full-report level.
//
// Usage (per section):
//   <ExportReportButton scope="beds" pdfSections={[{ exportId: 'export-beds', title: 'Bed-Wise Performance' }]} />
//
// Usage (full report):
//   <ExportReportButton scope="full" pdfSections={ALL_SECTIONS} label="Export Full Report" />

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { ExportDialog } from './ExportDialog'
import type { ExportScope, PdfSection } from '../types/export.types'

export interface ExportReportButtonProps {
  scope: ExportScope
  /** Sections to capture for PDF. One entry = section PDF; multiple = full report. */
  pdfSections?: PdfSection[]
  /** Title embedded in PDF header */
  pdfTitle?: string
  /** Username / role of logged-in user shown in PDF metadata */
  exportedBy?: string
  /** Optional shift filter forwarded to CSV server actions */
  shiftId?: string
  /** Button label (defaults to "Export") */
  label?: string
  /** Disable the button (e.g. in readOnly / auditor mode where writes are blocked) */
  disabled?: boolean
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  className?: string
}

export function ExportReportButton({
  scope,
  pdfSections = [],
  pdfTitle,
  exportedBy,
  shiftId,
  label = 'Export',
  disabled = false,
  size = 'sm',
  variant = 'outline',
  className,
}: ExportReportButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={className}
        data-no-export
      >
        <Download className="h-3.5 w-3.5" />
        {label}
      </Button>

      {open && (
        <ExportDialog
          scope={scope}
          pdfSections={pdfSections}
          pdfTitle={pdfTitle}
          exportedBy={exportedBy}
          shiftId={shiftId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
