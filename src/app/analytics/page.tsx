import { StageAnalyticsView } from '@/features/bed-dashboard/components/StageAnalyticsView'
import { AuditorHistoryView } from '@/features/bed-dashboard/components/AuditorHistoryView'
import { TatAnalyticsView } from '@/features/bed-dashboard/components/TatAnalyticsView'
import { LosView } from '@/features/bed-dashboard/components/LosView'
import { PatientCountView } from '@/features/management-report/components/PatientCountView'
import { ShiftReportView } from '@/features/shift-management/components/ShiftReportView'
import { ShiftComparisonView } from '@/features/shift-management/components/ShiftComparisonView'
import { DataRetentionView } from '@/features/data-retention/components/DataRetentionView'
import { getShifts } from '@/features/shift-management/lib/shift-queries'
import { getRetentionConfig } from '@/features/data-retention/lib/retention-config-queries'
import { getRecentArchivalRuns } from '@/features/data-retention/lib/archival-queries'
import { verifyActiveSession } from '@/shared/lib/active-session'
import { redirect } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { logAudit } from '@/shared/lib/audit'

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
            <Button variant="ghost" size="sm" className="gap-2" disabled>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <Link href={backHref}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          )}
          <div>
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
        </div>

        {/* Analytics View */}
        <StageAnalyticsView readOnly={isAuditMode} />

        {/* EPIC 12: Auditor read-only stage history */}
        <AuditorHistoryView readOnly={isAuditMode} />

        {/* Turnaround Time Analytics (US-2.4) */}
        <TatAnalyticsView readOnly={isAuditMode} />

        {/* ── Management Report Dashboard ───────────────────────────────── */}

        {/* Average Length of Stay (EPIC 10 / US-10.x) */}
        <LosView role={session.role} readOnly={isAuditMode} />

        {/* Total Patients Treated (US-10.1) */}
        <PatientCountView shifts={activeShifts} readOnly={isAuditMode} />

        {/* Shift Performance Report (US-8.3) */}
        {activeShifts.length > 0 && (
          <ShiftReportView shifts={activeShifts} readOnly={isAuditMode} />
        )}

        {/* Shift Performance Comparison (US-8.4) */}
        <ShiftComparisonView readOnly={isAuditMode} />

        {/* ── Data Retention & Archival (EPIC 14 / US-14.1, US-14.2) ───── */}
        {isRetentionVisible && retentionConfig && (
          <DataRetentionView
            initialConfig={retentionConfig}
            initialRuns={archivalRuns}
            readOnly={isAuditMode}
          />
        )}
      </div>
    </div>
  )
}