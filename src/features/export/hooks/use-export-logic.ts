import { useState, useCallback, useTransition } from 'react'
import type { ExportFormat, ExportScope, ResolvedDateRange, PdfSection } from '../types/export.types'
import {
    exportPatientCountCSV,
    exportDelayedPatientsCSV,
    exportBedPerformanceCSV,
    exportStageDelayCSV,
} from '../actions/export-actions'
import { exportStageTransitionsAsCSV } from '@/features/bed-dashboard/actions/analytics-export-actions'
import { buildFilename } from '../lib/pdf-generator'
import { downloadCsv, SCOPE_FILENAMES, SCOPE_LABELS } from '../lib/export-utils'

interface UseExportLogicProps {
    scope: ExportScope
    pdfSections: PdfSection[]
    pdfTitle?: string
    exportedBy?: string
    shiftId?: string
    onClose: () => void
}

export function useExportLogic({
    scope,
    pdfSections,
    pdfTitle,
    exportedBy,
    shiftId,
    onClose,
}: UseExportLogicProps) {
    const [format, setFormat] = useState<ExportFormat>('csv')
    const [range, setRange] = useState<ResolvedDateRange | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [pdfProgress, setPdfProgress] = useState<string | null>(null)

    const isLoading = isPending || pdfProgress !== null
    const resolvedTitle = pdfTitle ?? SCOPE_LABELS[scope]
    const baseFilename = SCOPE_FILENAMES[scope]

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

                results.forEach((res, i) => {
                    if (res.data) {
                        downloadCsv(res.data, buildFilename(labels[i], r, 'csv'))
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
        [scope, shiftId, baseFilename, onClose]
    )

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

    const handleExport = useCallback(() => {
        if (!range) return
        if (format === 'csv') {
            startTransition(() => { void handleCsvExport(range) })
        } else {
            void handlePdfExport(range)
        }
    }, [format, range, handleCsvExport, handlePdfExport])

    return {
        format,
        setFormat,
        range,
        setRange,
        error,
        isLoading,
        pdfProgress,
        handleExport,
        baseFilename,
        resolvedTitle,
    }
}
