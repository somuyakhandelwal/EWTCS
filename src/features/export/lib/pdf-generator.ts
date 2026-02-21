// PDF Generator — EPIC 11 (US-11.1)
// Uses jsPDF + html2canvas to capture DOM sections and assemble a professional
// PDF report. All rendering is client-side; no server round-trip needed.
//
// Usage:
//   import { generateSectionPDF, generateFullReportPDF } from '@/features/export/lib/pdf-generator'

import type { PdfSection, ResolvedDateRange } from '../types/export.types'

// ---------------------------------------------------------------------------
// Dynamic imports: these only load in the browser (no SSR issues).
// ---------------------------------------------------------------------------

async function loadDeps() {
  const [{ jsPDF }, html2canvas] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])
  return { jsPDF, html2canvas: html2canvas.default }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_WIDTH_MM = 210     // A4
const PAGE_HEIGHT_MM = 297    // A4
const MARGIN_MM = 15
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2

const HEADER_HEIGHT_MM = 28
const FOOTER_HEIGHT_MM = 10

/** Hex colours matching the app theme */
const COLORS = {
  bg: [18, 18, 18] as [number, number, number],          // zinc-950
  primary: [96, 165, 250] as [number, number, number],   // blue-400
  text: [228, 228, 231] as [number, number, number],     // zinc-200
  muted: [113, 113, 122] as [number, number, number],    // zinc-500
  divider: [63, 63, 70] as [number, number, number],     // zinc-700
  white: [255, 255, 255] as [number, number, number],
}

// ---------------------------------------------------------------------------
// Inner helpers
// ---------------------------------------------------------------------------

function addHeader(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  title: string,
  range: ResolvedDateRange,
  exportedBy: string,
  pageNum: number,
  totalPages: number
) {
  // Background fill at top
  doc.setFillColor(...COLORS.bg)
  doc.rect(0, 0, PAGE_WIDTH_MM, HEADER_HEIGHT_MM, 'F')

  // Blue accent bar
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, PAGE_WIDTH_MM, 1.5, 'F')

  // Hospital name
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.muted)
  doc.text('JMCH Medical College — Emergency Ward', MARGIN_MM, 8)

  // Report title
  doc.setFontSize(14)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'bold')
  doc.text(title, MARGIN_MM, 16)
  doc.setFont('helvetica', 'normal')

  // Right side: date range + page
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  doc.text(`Date Range: ${range.label}`, PAGE_WIDTH_MM - MARGIN_MM, 10, { align: 'right' })
  doc.text(`Exported by: ${exportedBy}`, PAGE_WIDTH_MM - MARGIN_MM, 15, { align: 'right' })
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH_MM - MARGIN_MM, 20, { align: 'right' })

  // Divider
  doc.setDrawColor(...COLORS.divider)
  doc.line(MARGIN_MM, HEADER_HEIGHT_MM - 2, PAGE_WIDTH_MM - MARGIN_MM, HEADER_HEIGHT_MM - 2)
}

function addFooter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  exportTimestamp: string
) {
  const y = PAGE_HEIGHT_MM - FOOTER_HEIGHT_MM
  doc.setDrawColor(...COLORS.divider)
  doc.line(MARGIN_MM, y, PAGE_WIDTH_MM - MARGIN_MM, y)
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.muted)
  doc.text(`Generated: ${exportTimestamp}`, MARGIN_MM, y + 5)
  doc.text('EWTCS — Emergency Ward Tracking & Control System', PAGE_WIDTH_MM / 2, y + 5, {
    align: 'center',
  })
}

// ---------------------------------------------------------------------------
// Core capture function
// ---------------------------------------------------------------------------

async function captureElement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  html2canvas: any,
  element: HTMLElement
): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#121212',
    // Ignore elements that shouldn't appear in the export (e.g. export buttons)
    ignoreElements: (el: Element) => el.hasAttribute('data-no-export'),
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PdfGenerateOptions {
  /** Title shown on the cover/header of the PDF */
  title: string
  /** The resolved date range embedded in metadata and filename */
  range: ResolvedDateRange
  /** Username / display name of the person exporting */
  exportedBy?: string
  /** Filename without extension (date range will be appended automatically) */
  baseFilename?: string
}

/**
 * Capture a single DOM element (identified by data-export-id) and save as PDF.
 * Used by per-section "Export PDF" buttons.
 */
export async function generateSectionPDF(
  exportId: string,
  options: PdfGenerateOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const element = document.querySelector(`[data-export-id="${exportId}"]`) as HTMLElement | null
    if (!element) {
      return { success: false, error: `Section "${exportId}" not found on page.` }
    }

    const { jsPDF, html2canvas } = await loadDeps()

    const canvas = await captureElement(html2canvas, element)

    const imgHeightMm =
      (canvas.height / canvas.width) * CONTENT_WIDTH_MM

    const usableHeight = PAGE_HEIGHT_MM - HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM - MARGIN_MM * 2
    const pageCount = Math.ceil(imgHeightMm / usableHeight)

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const exportedBy = options.exportedBy ?? 'Hospital Staff'
    const timestamp = new Date().toLocaleString()

    for (let i = 0; i < pageCount; i++) {
      if (i > 0) doc.addPage()

      addHeader(doc, options.title, options.range, exportedBy, i + 1, pageCount)
      addFooter(doc, timestamp)

      // Calculate the source slice of the canvas
      const srcY = (i * usableHeight * canvas.width) / CONTENT_WIDTH_MM
      const sliceHeightPx = (usableHeight * canvas.width) / CONTENT_WIDTH_MM

      const sliceCanvas = document.createElement('canvas')
      sliceCanvas.width = canvas.width
      sliceCanvas.height = Math.min(sliceHeightPx, canvas.height - srcY)
      const ctx = sliceCanvas.getContext('2d')!
      ctx.drawImage(canvas, 0, -srcY)

      const sliceImg = sliceCanvas.toDataURL('image/png')
      doc.addImage(
        sliceImg,
        'PNG',
        MARGIN_MM,
        HEADER_HEIGHT_MM + MARGIN_MM / 2,
        CONTENT_WIDTH_MM,
        Math.min(usableHeight, (sliceCanvas.height / sliceCanvas.width) * CONTENT_WIDTH_MM)
      )
    }

    const filename = buildFilename(options.baseFilename ?? 'report', options.range, 'pdf')
    doc.save(filename)
    return { success: true }
  } catch (err) {
    console.error('[pdf-generator] generateSectionPDF failed', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'PDF generation failed',
    }
  }
}

/**
 * Capture multiple DOM sections and assemble them into one multi-page PDF.
 * Used by the full-page "Export Full Report" button on the analytics page.
 */
export async function generateFullReportPDF(
  sections: PdfSection[],
  options: PdfGenerateOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const { jsPDF, html2canvas } = await loadDeps()
    const exportedBy = options.exportedBy ?? 'Hospital Staff'
    const timestamp = new Date().toLocaleString()

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    let isFirstPage = true
    let absolutePage = 0

    // We need to know total pages upfront; we'll patch this in a second pass.
    // For simplicity we use a single running page counter and update the header
    // text after all sections are captured. We'll use a two-pass approach.

    type RenderedSection = {
      title: string
      canvases: HTMLCanvasElement[]
    }

    const rendered: RenderedSection[] = []

    for (const section of sections) {
      const element = document.querySelector(
        `[data-export-id="${section.exportId}"]`
      ) as HTMLElement | null
      if (!element) continue

      const canvas = await captureElement(html2canvas, element)
      const imgHeightMm = (canvas.height / canvas.width) * CONTENT_WIDTH_MM
      const usableHeight =
        PAGE_HEIGHT_MM - HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM - MARGIN_MM * 2
      const pageCount = Math.ceil(imgHeightMm / usableHeight)

      const canvases: HTMLCanvasElement[] = []
      for (let i = 0; i < pageCount; i++) {
        const srcY = (i * usableHeight * canvas.width) / CONTENT_WIDTH_MM
        const sliceHeightPx = (usableHeight * canvas.width) / CONTENT_WIDTH_MM
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = Math.min(sliceHeightPx, canvas.height - srcY)
        const ctx = sliceCanvas.getContext('2d')!
        ctx.drawImage(canvas, 0, -srcY)
        canvases.push(sliceCanvas)
      }
      rendered.push({ title: section.title, canvases })
      absolutePage += canvases.length
    }

    const totalPages = absolutePage
    absolutePage = 0

    for (const { title, canvases } of rendered) {
      const sectionTitle = `${options.title} — ${title}`
      for (const sliceCanvas of canvases) {
        absolutePage++
        if (!isFirstPage) doc.addPage()
        isFirstPage = false

        addHeader(doc, sectionTitle, options.range, exportedBy, absolutePage, totalPages)
        addFooter(doc, timestamp)

        const usableHeight =
          PAGE_HEIGHT_MM - HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM - MARGIN_MM * 2
        doc.addImage(
          sliceCanvas.toDataURL('image/png'),
          'PNG',
          MARGIN_MM,
          HEADER_HEIGHT_MM + MARGIN_MM / 2,
          CONTENT_WIDTH_MM,
          Math.min(usableHeight, (sliceCanvas.height / sliceCanvas.width) * CONTENT_WIDTH_MM)
        )
      }
    }

    if (absolutePage === 0) {
      return { success: false, error: 'No visible sections found to export.' }
    }

    const filename = buildFilename(options.baseFilename ?? 'full-report', options.range, 'pdf')
    doc.save(filename)
    return { success: true }
  } catch (err) {
    console.error('[pdf-generator] generateFullReportPDF failed', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'PDF generation failed',
    }
  }
}

// ---------------------------------------------------------------------------
// Filename helper (also used by CSV download)
// ---------------------------------------------------------------------------

/**
 * Build a filename including the date range per US-11.3 AC.
 * e.g. "bed-performance_2026-01-22_2026-02-21.csv"
 */
export function buildFilename(
  base: string,
  range: ResolvedDateRange,
  ext: 'pdf' | 'csv'
): string {
  const start = range.startDate.toISOString().slice(0, 10)
  const end = range.endDate.toISOString().slice(0, 10)
  return `${base}_${start}_${end}.${ext}`
}
