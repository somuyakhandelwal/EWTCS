import { verifyActiveSession } from '@/shared/lib/active-session'
import { redirect } from 'next/navigation'
import { logAudit } from '@/shared/lib/audit'
import { getShifts } from '@/features/shift-management/lib/shift-queries'
import { getRetentionConfig } from '@/features/data-retention/lib/retention-config-queries'
import { getRecentArchivalRuns } from '@/features/data-retention/lib/archival-queries'
import { AnalyticsPageContent } from '@/features/bed-dashboard/components/AnalyticsPageContent'
import '@/app/analytics/print.css'

export default async function AnalyticsPage() {
  const session = await verifyActiveSession()

  if (!session) redirect('/login')

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
        metadata: { role: session.role, mode: 'read-only' },
      })
    } catch {
      // Non-blocking
    }
  }

  const backHref = session.role === 'supervisor'
    ? '/supervisor'
    : session.role === 'admin'
      ? '/admin'
      : '/analytics'

  let activeShifts: Awaited<ReturnType<typeof getShifts>> = []
  try {
    activeShifts = await getShifts()
  } catch {
    // Non-blocking
  }

  const isRetentionVisible = session.role === 'admin' || session.role === 'auditor'
  const retentionConfig = isRetentionVisible ? await getRetentionConfig().catch(() => null) : null
  const archivalRuns   = isRetentionVisible ? await getRecentArchivalRuns(10).catch(() => []) : []

  return (
    <AnalyticsPageContent
      isAuditMode={isAuditMode}
      backHref={backHref}
      username={session.username}
      role={session.role}
      activeShifts={activeShifts}
      retentionConfig={retentionConfig}
      archivalRuns={archivalRuns}
    />
  )
}