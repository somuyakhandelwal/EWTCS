import type { PdfSection } from '@/features/export/types/export.types'

export const ANALYTICS_REPORT_TITLE = 'Emergency Ward and Triage Analytics Report'

export const ANALYTICS_PAGE_TITLE = 'Emergency Ward and Triage Analytics'

export const ANALYTICS_PAGE_DESCRIPTION =
  'Review ER workflow, triage workflow, and cleaning performance separately'

export const FULL_REPORT_SECTIONS: PdfSection[] = [
  { exportId: 'export-stage-analytics', title: 'Workflow Analytics by Area' },
  { exportId: 'export-auditor-history', title: 'Bed Stage Change History' },
  { exportId: 'export-tat', title: 'Legacy Bed-to-Bed Turnaround (Historical)' },
  { exportId: 'export-los', title: 'Average Length of Stay' },
  { exportId: 'export-patients', title: 'Total Patients Treated' },
  { exportId: 'export-delayed', title: 'Delayed Patients %' },
  { exportId: 'export-beds', title: 'Bed-Wise Performance' },
  { exportId: 'export-stages', title: 'Stage-Wise Delays' },
  { exportId: 'export-shift-report', title: 'Shift Performance Report' },
  { exportId: 'export-shift-comparison', title: 'Shift Performance Comparison' },
  { exportId: 'export-correction-audit', title: 'Correction Audit Trail' },
  { exportId: 'export-heatmap', title: 'Staffing Heatmap' },
]
