// PDF Generator — EPIC 11 (US-11.1)
// Uses jsPDF + html2canvas to capture DOM sections and assemble a professional PDF report.

import type { PdfSection, ResolvedDateRange } from '../types/export.types'
import {
  PAGE_HEIGHT_MM,
  MARGIN_MM,
  CONTENT_WIDTH_MM,
  HEADER_HEIGHT_MM,
  FOOTER_HEIGHT_MM,
  addHeader,
  addFooter,
} from './pdf-core-utils'

async function loadDeps() {
  const [{ jsPDF }, html2canvas] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])
  return { jsPDF, html2canvas: html2canvas.default }
}

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
    ignoreElements: (el: Element) => el.hasAttribute('data-no-export'),
  })
}

export interface PdfGenerateOptions {
  title: string
  range: ResolvedDateRange
  exportedBy?: string
  baseFilename?: string
}

export async function generateSectionPDF(
  exportId: string,
  options: PdfGenerateOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const element = document.querySelector(`[data-export-id="${exportId}"]`) as HTMLElement | null
    if (!element) return { success: false, error: `Section "${exportId}" not found on page.` }

    const { jsPDF, html2canvas } = await loadDeps()
    const canvas = await captureElement(html2canvas, element)
    const imgHeightMm = (canvas.height / canvas.width) * CONTENT_WIDTH_MM
    const usableHeight = PAGE_HEIGHT_MM - HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM - MARGIN_MM * 2
    const pageCount = Math.ceil(imgHeightMm / usableHeight)

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const exportedBy = options.exportedBy ?? 'Hospital Staff'
    const timestamp = new Date().toLocaleString()

    for (let i = 0; i < pageCount; i++) {
      if (i > 0) doc.addPage()
      addHeader(doc, options.title, options.range, exportedBy, i + 1, pageCount)
      addFooter(doc, timestamp)

      const srcY = (i * usableHeight * canvas.width) / CONTENT_WIDTH_MM
      const sliceHeightPx = (usableHeight * canvas.width) / CONTENT_WIDTH_MM
      const sliceCanvas = document.createElement('canvas')
      sliceCanvas.width = canvas.width
      sliceCanvas.height = Math.min(sliceHeightPx, canvas.height - srcY)
      const ctx = sliceCanvas.getContext('2d')!
      ctx.drawImage(canvas, 0, -srcY)

      doc.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', MARGIN_MM, HEADER_HEIGHT_MM + MARGIN_MM / 2, CONTENT_WIDTH_MM, Math.min(usableHeight, (sliceCanvas.height / sliceCanvas.width) * CONTENT_WIDTH_MM))
    }

    doc.save(buildFilename(options.baseFilename ?? 'report', options.range, 'pdf'))
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'PDF generation failed' }
  }
}

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

    const rendered: { title: string; canvases: HTMLCanvasElement[] }[] = []

    for (const section of sections) {
      const element = document.querySelector(`[data-export-id="${section.exportId}"]`) as HTMLElement | null
      if (!element) continue

      const canvas = await captureElement(html2canvas, element)
      const imgHeightMm = (canvas.height / canvas.width) * CONTENT_WIDTH_MM
      const usableHeight = PAGE_HEIGHT_MM - HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM - MARGIN_MM * 2
      const pageCount = Math.ceil(imgHeightMm / usableHeight)

      const canvases: HTMLCanvasElement[] = []
      for (let i = 0; i < pageCount; i++) {
        const srcY = (i * usableHeight * canvas.width) / CONTENT_WIDTH_MM
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = Math.min((usableHeight * canvas.width) / CONTENT_WIDTH_MM, canvas.height - srcY)
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
      for (const sliceCanvas of canvases) {
        absolutePage++
        if (!isFirstPage) doc.addPage()
        isFirstPage = false
        addHeader(doc, `${options.title} — ${title}`, options.range, exportedBy, absolutePage, totalPages)
        addFooter(doc, timestamp)
        doc.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', MARGIN_MM, HEADER_HEIGHT_MM + MARGIN_MM / 2, CONTENT_WIDTH_MM, Math.min(PAGE_HEIGHT_MM - HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM - MARGIN_MM * 2, (sliceCanvas.height / sliceCanvas.width) * CONTENT_WIDTH_MM))
      }
    }

    if (absolutePage === 0) return { success: false, error: 'No visible sections found.' }
    doc.save(buildFilename(options.baseFilename ?? 'full-report', options.range, 'pdf'))
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'PDF generation failed' }
  }
}

export function buildFilename(base: string, range: ResolvedDateRange, ext: 'pdf' | 'csv'): string {
  const start = range.startDate.toISOString().slice(0, 10)
  const end = range.endDate.toISOString().slice(0, 10)
  return `${base}_${start}_${end}.${ext}`
}
