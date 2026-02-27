import type { ExportScope } from '../types/export.types'

// Canonical download utility — DOM-safe, Firefox-compatible.
export { downloadCsv } from '@/shared/lib/csv-download'

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
