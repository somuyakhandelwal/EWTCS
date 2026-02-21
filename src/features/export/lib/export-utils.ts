import type { ExportScope } from '../types/export.types'

export function downloadCsv(csv: string, filename: string) {
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

export const SCOPE_LABELS: Record<ExportScope, string> = {
    full: 'Full Analytics Report',
    patients: 'Patient Count',
    delayed: 'Delayed Patients %',
    beds: 'Bed-Wise Performance',
    stages: 'Stage-Wise Delays',
    transitions: 'Stage Transitions',
}

export const SCOPE_FILENAMES: Record<ExportScope, string> = {
    full: 'full-analytics-report',
    patients: 'patient-count',
    delayed: 'delayed-patients',
    beds: 'bed-performance',
    stages: 'stage-delays',
    transitions: 'stage-transitions',
}
