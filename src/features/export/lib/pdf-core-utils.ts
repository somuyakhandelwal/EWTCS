import type { ResolvedDateRange } from '../types/export.types'

export const PAGE_WIDTH_MM = 210
export const PAGE_HEIGHT_MM = 297
export const MARGIN_MM = 15
export const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2
export const HEADER_HEIGHT_MM = 28
export const FOOTER_HEIGHT_MM = 10

export const COLORS = {
    bg: [18, 18, 18] as [number, number, number],
    primary: [96, 165, 250] as [number, number, number],
    text: [228, 228, 231] as [number, number, number],
    muted: [113, 113, 122] as [number, number, number],
    divider: [63, 63, 70] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
}

import type jsPDF from 'jspdf'

export function addHeader(
    doc: jsPDF,
    title: string,
    range: ResolvedDateRange,
    exportedBy: string,
    pageNum: number,
    totalPages: number
) {
    doc.setFillColor(...COLORS.bg)
    doc.rect(0, 0, PAGE_WIDTH_MM, HEADER_HEIGHT_MM, 'F')
    doc.setFillColor(...COLORS.primary)
    doc.rect(0, 0, PAGE_WIDTH_MM, 1.5, 'F')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.muted)
    doc.text('JMCH Medical College — Emergency Ward', MARGIN_MM, 8)
    doc.setFontSize(14)
    doc.setTextColor(...COLORS.text)
    doc.setFont('helvetica', 'bold')
    doc.text(title, MARGIN_MM, 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.muted)
    doc.text(`Date Range: ${range.label}`, PAGE_WIDTH_MM - MARGIN_MM, 10, { align: 'right' })
    doc.text(`Exported by: ${exportedBy}`, PAGE_WIDTH_MM - MARGIN_MM, 15, { align: 'right' })
    doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH_MM - MARGIN_MM, 20, { align: 'right' })
    doc.setDrawColor(...COLORS.divider)
    doc.line(MARGIN_MM, HEADER_HEIGHT_MM - 2, PAGE_WIDTH_MM - MARGIN_MM, HEADER_HEIGHT_MM - 2)
}

export function addFooter(doc: jsPDF, exportTimestamp: string) {
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
