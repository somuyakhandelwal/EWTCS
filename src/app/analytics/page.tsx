import { verifyActiveSession } from '@/shared/lib/active-session'
import { redirect } from 'next/navigation'
import { logAudit } from '@/shared/lib/audit'
import { AnalyticsPageContent } from '@/features/bed-dashboard/components/AnalyticsPageContent'
import '@/app/analytics/print.css'

export default async function AnalyticsPage() {
  const session = await verifyActiveSession()

  if (!session) redirect('/api/auth/force-logout')

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

  return (
    <AnalyticsPageContent
      isAuditMode={isAuditMode}
      backHref={backHref}
      username={session.username}
      role={session.role}
    />
  )
}