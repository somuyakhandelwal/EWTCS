import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
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
import { AnalyticsShiftsContainer } from '@/features/management-report/components/AnalyticsShiftsContainer'
import { DataRetentionContainer } from '@/features/data-retention/components/DataRetentionContainer'
import {
  ANALYTICS_PAGE_DESCRIPTION,
  ANALYTICS_PAGE_TITLE,
  ANALYTICS_REPORT_TITLE,
  FULL_REPORT_SECTIONS,
} from './analytics-report-copy'

interface Props {
  isAuditMode: boolean
  backHref: string
  username: string
  role: string
}

function SectionSkeleton() {
  return (
    <div className="flex h-48 w-full items-center justify-center rounded-xl border border-border bg-card/50 animate-pulse">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export function AnalyticsPageContent({ isAuditMode, backHref, username, role }: Props) {
  const printDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const isRetentionVisible = role === 'admin' || role === 'auditor'

  return (
    <div className="min-h-screen bg-background p-3 text-foreground sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <div className="print-header hidden">
          <h1>JMCH {ANALYTICS_REPORT_TITLE}</h1>
          <p>Generated on {printDate}</p>
        </div>

        <div
          className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
          data-help-id="analytics-header"
        >
          {isAuditMode ? (
            <LogoutButton />
          ) : (
            <Tooltip content="Return to previous page" side="bottom">
              <Link href={backHref}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
            </Tooltip>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {ANALYTICS_PAGE_TITLE}
            </h1>
            <p className="text-muted-foreground">{ANALYTICS_PAGE_DESCRIPTION}</p>
            {isAuditMode ? (
              <div className="mt-2 inline-flex items-center rounded-md border border-status-audit/40 bg-status-audit/10 px-3 py-1 text-xs font-medium text-status-audit">
                Audit Mode: Read-Only Access
              </div>
            ) : null}
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
                pdfTitle={ANALYTICS_REPORT_TITLE}
                exportedBy={username}
                label="Export Full Report"
                size="sm"
              />
            </span>
          </Tooltip>
        </div>

        <div
          data-export-id="export-stage-analytics"
          className="print-no-break"
          data-help-id="analytics-stage-analytics"
        >
          <Suspense fallback={<SectionSkeleton />}>
            <StageAnalyticsView readOnly={isAuditMode} />
          </Suspense>
        </div>
        <div
          data-export-id="export-auditor-history"
          className="print-section print-no-break"
          data-help-id="analytics-history"
        >
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

        {isRetentionVisible ? (
          <div className="print-section print-no-break">
            <Suspense fallback={<SectionSkeleton />}>
              <DataRetentionContainer readOnly={isAuditMode} />
            </Suspense>
          </div>
        ) : null}

        <div data-export-id="export-heatmap" className="print-section print-no-break">
          <StaffingHeatmap />
        </div>
      </div>
    </div>
  )
}
