import { StageAnalyticsView } from '@/features/bed-dashboard/components/StageAnalyticsView'
import { AuditorHistoryView } from '@/features/bed-dashboard/components/AuditorHistoryView'
import { TatAnalyticsView } from '@/features/bed-dashboard/components/TatAnalyticsView'
import { LosView } from '@/features/bed-dashboard/components/LosView'
import { PatientCountView } from '@/features/management-report/components/PatientCountView'
import { DelayedPatientPercentageView } from '@/features/management-report/components/DelayedPatientPercentageView'
import { BedPerformanceView } from '@/features/management-report/components/BedPerformanceView'
import { StageDelayView } from '@/features/management-report/components/StageDelayView'
import { ShiftReportView } from '@/features/shift-management/components/ShiftReportView'
import { ShiftComparisonView } from '@/features/shift-management/components/ShiftComparisonView'
import { DataRetentionView } from '@/features/data-retention/components/DataRetentionView'
import { StaffingHeatmap } from '@/features/bed-dashboard/components/StaffingHeatmap'
import { ExportReportButton } from '@/features/export/components/ExportReportButton'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { PrintButton } from '@/features/bed-dashboard/components/PrintButton'
import { Button } from '@/shared/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { PdfSection } from '@/features/export/types/export.types'
import type { getShifts } from '@/features/shift-management/lib/shift-queries'
import type { getRetentionConfig } from '@/features/data-retention/lib/retention-config-queries'
import type { getRecentArchivalRuns } from '@/features/data-retention/lib/archival-queries'

const FULL_REPORT_SECTIONS: PdfSection[] = [
  { exportId: 'export-stage-analytics',   title: 'Stage Analytics' },
  { exportId: 'export-auditor-history',   title: 'Bed Stage Change History' },
  { exportId: 'export-tat',              title: 'Full-Cycle Bed Turnaround' },
  { exportId: 'export-los',              title: 'Average Length of Stay' },
  { exportId: 'export-patients',         title: 'Total Patients Treated' },
  { exportId: 'export-delayed',          title: 'Delayed Patients %' },
  { exportId: 'export-beds',             title: 'Bed-Wise Performance' },
  { exportId: 'export-stages',           title: 'Stage-Wise Delays' },
  { exportId: 'export-shift-report',     title: 'Shift Performance Report' },
  { exportId: 'export-shift-comparison', title: 'Shift Performance Comparison' },
  { exportId: 'export-heatmap',          title: 'Staffing Heatmap' },
]

interface Props {
  isAuditMode: boolean
  backHref: string
  username: string
  role: string
  activeShifts: Awaited<ReturnType<typeof getShifts>>
  retentionConfig: Awaited<ReturnType<typeof getRetentionConfig>> | null
  archivalRuns: Awaited<ReturnType<typeof getRecentArchivalRuns>>
}

export function AnalyticsPageContent({
  isAuditMode,
  backHref,
  username,
  role,
  activeShifts,
  retentionConfig,
  archivalRuns,
}: Props) {
  const printDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const isRetentionVisible = role === 'admin' || role === 'auditor'

  return (
    <div className="min-h-screen bg-black text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* US-11.4: Print-only header */}
        <div className="print-header hidden">
          <h1>JMCH Emergency Ward – Analytics Report</h1>
          <p>Generated on {printDate}</p>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4">
          {isAuditMode ? <LogoutButton /> : (
            <Link href={backHref}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />Back
              </Button>
            </Link>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">Emergency Ward Analytics</h1>
            <p className="text-zinc-400">Analyze patient flow through treatment stages</p>
            {isAuditMode && (
              <div className="mt-2 inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                Audit Mode: Read-Only Access
              </div>
            )}
          </div>
          <PrintButton />
          <ExportReportButton
            scope="full"
            pdfSections={FULL_REPORT_SECTIONS}
            pdfTitle="Emergency Ward Analytics Report"
            exportedBy={username}
            label="Export Full Report"
            size="sm"
            variant="outline"
          />
        </div>

        <div data-export-id="export-stage-analytics" className="print-no-break">
          <StageAnalyticsView readOnly={isAuditMode} />
        </div>
        <div data-export-id="export-auditor-history" className="print-section print-no-break">
          <AuditorHistoryView readOnly={isAuditMode} showCorrections />
        </div>
        <div data-export-id="export-tat" className="print-section print-no-break">
          <TatAnalyticsView readOnly={isAuditMode} />
        </div>
        <div data-export-id="export-los" className="print-section print-no-break">
          <LosView role={role} readOnly={isAuditMode} />
        </div>
        <div data-export-id="export-patients" className="print-section print-no-break">
          <PatientCountView shifts={activeShifts} readOnly={isAuditMode} />
        </div>
        <div data-export-id="export-delayed" className="print-section print-no-break">
          <DelayedPatientPercentageView shifts={activeShifts} readOnly={isAuditMode} role={role} />
        </div>
        <div data-export-id="export-beds" className="print-section print-no-break">
          <BedPerformanceView shifts={activeShifts} readOnly={isAuditMode} />
        </div>
        <div data-export-id="export-stages" className="print-section print-no-break">
          <StageDelayView readOnly={isAuditMode} />
        </div>
        {activeShifts.length > 0 && (
          <div data-export-id="export-shift-report" className="print-section print-no-break">
            <ShiftReportView shifts={activeShifts} readOnly={isAuditMode} />
          </div>
        )}
        <div data-export-id="export-shift-comparison" className="print-section print-no-break">
          <ShiftComparisonView readOnly={isAuditMode} />
        </div>
        {isRetentionVisible && retentionConfig && (
          <div className="print-section print-no-break">
            <DataRetentionView initialConfig={retentionConfig} initialRuns={archivalRuns} readOnly={isAuditMode} />
          </div>
        )}
        <div data-export-id="export-heatmap" className="print-section print-no-break">
          <StaffingHeatmap />
        </div>

      </div>
    </div>
  )
}