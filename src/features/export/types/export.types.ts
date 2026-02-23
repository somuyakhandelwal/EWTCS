// Export Feature Types — EPIC 11 (US-11.1, US-11.2, US-11.3)
// Shared types for PDF and CSV export across all report views.

/** Supported export formats */
export type ExportFormat = 'pdf' | 'csv'

/**
 * The scope of what is being exported.
 * 'full'      → All analytics sections (used from the analytics page header)
 * 'patients'  → Patient Count section (US-10.1)
 * 'delayed'   → Delayed Patient % section (US-10.3)
 * 'beds'      → Bed-Wise Performance section (US-10.4)
 * 'stages'    → Stage-Wise Delays section (US-10.5)
 * 'transitions' → Stage Transition log (existing CSV action)
 */
export type ExportScope =
  | 'full'
  | 'patients'
  | 'delayed'
  | 'beds'
  | 'stages'
  | 'transitions'

/**
 * A resolved date range ready for import into server actions.
 * Both dates are at midnight (start) / 23:59:59 (end) in local time.
 */
export interface ResolvedDateRange {
  startDate: Date
  endDate: Date
  /** Human-readable label shown in the dialog and embedded in the filename. */
  label: string
}

/**
 * Options passed to the ExportDialog and forwarded to export utilities.
 */
export interface ExportOptions {
  scope: ExportScope
  format: ExportFormat
  range: ResolvedDateRange
  /** Optional shift filter — 'all' means no shift filter applied */
  shiftId?: string
}

/**
 * Result returned by any CSV export server action.
 */
export interface CsvExportResult {
  success: boolean
  /** Raw CSV string */
  data?: string
  error?: string
}

/**
 * A single entry in the section registry used by the PDF generator
 * to locate DOM nodes.
 */
export interface PdfSection {
  /** Matches the data-export-id attribute on the DOM element */
  exportId: string
  /** Human-readable section title printed above the screenshot */
  title: string
}

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
