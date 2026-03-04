import { StageAnalyticsView } from '@/features/bed-dashboard/components/StageAnalyticsView'
import { AuditorHistoryView } from '@/features/bed-dashboard/components/AuditorHistoryView'
import { TatAnalyticsView } from '@/features/bed-dashboard/components/TatAnalyticsView'
import { LosView } from '@/features/bed-dashboard/components/LosView'
import { StageDelayView } from '@/features/management-report/components/StageDelayView'
import { ShiftComparisonView } from '@/features/shift-management/components/ShiftComparisonView'
import { StaffingHeatmap } from '@/features/bed-dashboard/components/StaffingHeatmap'
import { ExportReportButton } from '@/features/export/components/ExportReportButton'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { CorrectionAuditTrailView } from '@/features/bed-dashboard/components/CorrectionAuditTrailView'
import { PrintButton } from '@/features/bed-dashboard/components/PrintButton'
import { Button } from '@/shared/components/ui/button'
import { Tooltip } from '@/shared/components/ui/tooltip'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import type { PdfSection } from '@/features/export/types/export.types'
import { AnalyticsShiftsContainer } from '@/features/management-report/components/AnalyticsShiftsContainer'
import { DataRetentionContainer } from '@/features/data-retention/components/DataRetentionContainer'

const FULL_REPORT_SECTIONS: PdfSection[] = [
  { exportId: 'export-stage-analytics', title: 'Stage Analytics' },
  { exportId: 'export-auditor-history', title: 'Bed Stage Change History' },
  { exportId: 'export-tat', title: 'Full-Cycle Bed Turnaround' },
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

interface Props {
  isAuditMode: boolean
  backHref: string
  username: string
  role: string
}

function SectionSkeleton() {
  return (
    <div className="w-full h-48 rounded-xl border border-border bg-card/50 flex items-center justify-center animate-pulse">
      <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
    </div>
  )
}

export function AnalyticsPageContent({
  isAuditMode,
  backHref,
  username,
  role,
}: Props) {
  const printDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const isRetentionVisible = role === 'admin' || role === 'auditor'

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

        {/* US-11.4: Print-only header */}
        <div className="print-header hidden">
          <h1>JMCH Emergency Ward – Analytics Report</h1>
          <p>Generated on {printDate}</p>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" data-help-id="analytics-header">
          {isAuditMode ? <LogoutButton /> : (
            <Tooltip content="Return to previous page" side="bottom">
              <Link href={backHref}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />Back
                </Button>
              </Link>
            </Tooltip>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Emergency Ward Analytics</h1>
            <p className="text-muted-foreground">Analyze patient flow through treatment stages</p>
            {isAuditMode && (
              <div className="mt-2 inline-flex items-center rounded-md border border-status-audit/40 bg-status-audit/10 px-3 py-1 text-xs font-medium text-status-audit">
                Audit Mode: Read-Only Access
              </div>
            )}
          </div>
          <Tooltip content="Print current analytics view" side="bottom">
            <span>
              <PrintButton />
            </span>
          </Tooltip>
          <Tooltip content="Download full PDF report" side="bottom">
            <span>
              <ExportReportButton
                scope="full"
                pdfSections={FULL_REPORT_SECTIONS}
                pdfTitle="Emergency Ward Analytics Report"
                exportedBy={username}
                label="Export Full Report"
                size="sm"
              />
            </span>
          </Tooltip>
        </div>

        <div data-export-id="export-stage-analytics" className="print-no-break" data-help-id="analytics-stage-analytics">
          <Suspense fallback={<SectionSkeleton />}>
            <StageAnalyticsView readOnly={isAuditMode} />
          </Suspense>
        </div>
        <div data-export-id="export-auditor-history" className="print-section print-no-break" data-help-id="analytics-history">
          <Suspense fallback={<SectionSkeleton />}>
            <AuditorHistoryView
              readOnly={isAuditMode}
              showCorrections
              canOverrideShift={!isAuditMode && (role === 'supervisor' || role === 'admin')}
            />
          </Suspense>
        </div>
        <div data-export-id="export-tat" className="print-section print-no-break">
          <Suspense fallback={<SectionSkeleton />}>
            <TatAnalyticsView readOnly={isAuditMode} />
          </Suspense>
        </div>
        <div data-export-id="export-los" className="print-section print-no-break">
          <Suspense fallback={<SectionSkeleton />}>
            <LosView role={role} readOnly={isAuditMode} />
          </Suspense>
        </div>

        {/* Parallel Streams for Shift-based and Retention data */}
        <Suspense fallback={<SectionSkeleton />}>
          <AnalyticsShiftsContainer role={role} isAuditMode={isAuditMode} />
        </Suspense>

        <div className="print-section print-no-break">
          <Suspense fallback={<SectionSkeleton />}>
            <StageDelayView readOnly={isAuditMode} />
          </Suspense>
        </div>

        <div data-export-id="export-shift-comparison" className="print-section print-no-break">
          <Suspense fallback={<SectionSkeleton />}>
            <ShiftComparisonView readOnly={isAuditMode} />
          </Suspense>
        </div>
        <div data-export-id="export-correction-audit" className="print-section print-no-break">
          <Suspense fallback={<SectionSkeleton />}>
            <CorrectionAuditTrailView readOnly={isAuditMode} />
          </Suspense>
        </div>

        {isRetentionVisible && (
          <div className="print-section print-no-break">
            <Suspense fallback={<SectionSkeleton />}>
              <DataRetentionContainer readOnly={isAuditMode} />
            </Suspense>
          </div>
        )}

        <div data-export-id="export-heatmap" className="print-section print-no-break">
          <StaffingHeatmap />
        </div>

      </div>
    </div>
  )
}
