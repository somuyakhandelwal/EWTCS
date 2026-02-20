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
import { getShifts } from '@/features/shift-management/lib/shift-queries'
import { getRetentionConfig } from '@/features/data-retention/lib/retention-config-queries'
import { getRecentArchivalRuns } from '@/features/data-retention/lib/archival-queries'
import { StaffingHeatmap } from '@/features/bed-dashboard/components/StaffingHeatmap'
import { verifyActiveSession } from '@/shared/lib/active-session'
import { redirect } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { logAudit } from '@/shared/lib/audit'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { ExportReportButton } from '@/features/export/components/ExportReportButton'
import type { PdfSection } from '@/features/export/types/export.types'

// All sections available for the full-report PDF (US-11.1)
const FULL_REPORT_SECTIONS: PdfSection[] = [
  { exportId: 'export-stage-analytics',  title: 'Stage Analytics' },
  { exportId: 'export-auditor-history',  title: 'Bed Stage Change History' },
  { exportId: 'export-tat',             title: 'Full-Cycle Bed Turnaround' },
  { exportId: 'export-los',             title: 'Average Length of Stay' },
  { exportId: 'export-patients',        title: 'Total Patients Treated' },
  { exportId: 'export-delayed',         title: 'Delayed Patients %' },
  { exportId: 'export-beds',            title: 'Bed-Wise Performance' },
  { exportId: 'export-stages',          title: 'Stage-Wise Delays' },
  { exportId: 'export-shift-report',    title: 'Shift Performance Report' },
  { exportId: 'export-shift-comparison',title: 'Shift Performance Comparison' },
  { exportId: 'export-heatmap',         title: 'Staffing Heatmap' },
]

export default async function AnalyticsPage() {
  const session = await verifyActiveSession()

  if (!session) {
    redirect('/login')
  }

  // Only supervisor, admin, and auditor can view analytics
  if (session.role !== 'supervisor' && session.role !== 'admin' && session.role !== 'auditor') {
    redirect('/dashboard')
  }

  const isAuditMode = session.role === 'auditor'

  if (isAuditMode) {
    try {
      await logAudit({
        actionType: 'AUDIT_MODE_ACCESS',
        entityType: 'analytics',
        entityId: 'analytics-dashboard',
        performedBy: session.userId,
        reason: 'Auditor accessed analytics in read-only mode',
        metadata: {
          role: session.role,
          mode: 'read-only',
        },
      })
    } catch {
      // Non-blocking log path for analytics visibility
    }
  }

  const backHref = session.role === 'supervisor'
    ? '/supervisor'
    : session.role === 'admin'
      ? '/admin'
      : '/analytics'

  // Fetch active shifts server-side so they can be passed to client components
  // that need a shift selector (US-10.1, US-8.3).
  let activeShifts: Awaited<ReturnType<typeof getShifts>> = []
  try {
    activeShifts = await getShifts()
  } catch {
    // Non-blocking: components will render with an empty shift list gracefully
  }

  // EPIC 14: Retention config + recent archival runs — admin and auditor only
  const isRetentionVisible = session.role === 'admin' || session.role === 'auditor'
  const retentionConfig = isRetentionVisible ? await getRetentionConfig().catch(() => null) : null
  const archivalRuns   = isRetentionVisible ? await getRecentArchivalRuns(10).catch(() => []) : []

  return (
    <div className="min-h-screen bg-black text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          {isAuditMode ? (
            <LogoutButton />
          ) : (
            <Link href={backHref}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Emergency Ward Analytics
            </h1>
            <p className="text-zinc-400">Analyze patient flow through treatment stages</p>
            {isAuditMode && (
              <div className="mt-2 inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                Audit Mode: Read-Only Access
              </div>
            )}
          </div>
          {/* EPIC 11 (US-11.1): Full-report export button */}
          <ExportReportButton
            scope="full"
            pdfSections={FULL_REPORT_SECTIONS}
            pdfTitle="Emergency Ward Analytics Report"
            exportedBy={session.username}
            label="Export Full Report"
            size="sm"
            variant="outline"
          />
        </div>

        {/* Analytics View (US-3.x: Stage duration + bed timeline) */}
        <div data-export-id="export-stage-analytics">
          <StageAnalyticsView readOnly={isAuditMode} />
        </div>

        {/* EPIC 12: Auditor read-only stage history */}
        <div data-export-id="export-auditor-history">
          <AuditorHistoryView readOnly={isAuditMode} />
        </div>

        {/* Turnaround Time Analytics (US-2.4) */}
        <div data-export-id="export-tat">
          <TatAnalyticsView readOnly={isAuditMode} />
        </div>

        {/* ── Management Report Dashboard ───────────────────────────────── */}

        {/* Average Length of Stay (EPIC 10 / US-10.x) */}
        <div data-export-id="export-los">
          <LosView role={session.role} readOnly={isAuditMode} />
        </div>

        {/* Total Patients Treated (US-10.1) — data-export-id on component root */}
        <PatientCountView shifts={activeShifts} readOnly={isAuditMode} />

        {/* ── US-10.3: Percentage of Delayed Patients ──────────────────── */}
        <DelayedPatientPercentageView
          shifts={activeShifts}
          readOnly={isAuditMode}
          role={session.role}
        />

        {/* ── US-10.4: Bed-Wise Performance ────────────────────────────── */}
        <BedPerformanceView shifts={activeShifts} readOnly={isAuditMode} />

        {/* ── US-10.5: Stage-Wise Delays ───────────────────────────────── */}
        <StageDelayView readOnly={isAuditMode} />

        {/* Shift Performance Report (US-8.3) */}
        {activeShifts.length > 0 && (
          <div data-export-id="export-shift-report">
            <ShiftReportView shifts={activeShifts} readOnly={isAuditMode} />
          </div>
        )}

        {/* Shift Performance Comparison (US-8.4) */}
        <div data-export-id="export-shift-comparison">
          <ShiftComparisonView readOnly={isAuditMode} />
        </div>

        {/* ── Data Retention & Archival (EPIC 14 / US-14.1, US-14.2) ───── */}
        {isRetentionVisible && retentionConfig && (
          <DataRetentionView
            initialConfig={retentionConfig}
            initialRuns={archivalRuns}
            readOnly={isAuditMode}
          />
        )}

        {/* Staffing Heatmap — EPIC 10: patient volume by hour and day of week */}
        <div data-export-id="export-heatmap">
          <StaffingHeatmap />
        </div>
      </div>
    </div>
  )
}