import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bell, ArrowLeft, ClipboardList } from 'lucide-react'
import { verifyActiveSession } from '@/shared/lib/active-session'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { AlertScreen } from '@/features/notifications/components/AlertScreen'
import { getAlertScreenData } from '@/features/notifications/actions/alert-screen-actions'

export const dynamic = 'force-dynamic'

export default async function SupervisorAlertsPage() {
  const session = await verifyActiveSession()

  if (!session) {
    redirect('/api/auth/force-logout')
  }

  if (session.role !== 'supervisor' && session.role !== 'admin') {
    redirect('/dashboard')
  }

  // Pre-fetch on server for instant first render
  const alertResult = await getAlertScreenData()
  const initialData = alertResult.success ? (alertResult.data ?? null) : null

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/supervisor"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-900/20 border border-amber-900/50 rounded-full">
                <Bell className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Alert Screen
                </h1>
                <p className="text-muted-foreground text-xs">
                  Delayed beds · Escalations · System errors
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Link
              href="/supervisor"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-zinc-700 border border-border text-card-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              <ClipboardList className="h-4 w-4 text-amber-500" />
              Dashboard
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* Main alert feed */}
        <AlertScreen initialData={initialData} />
      </div>
    </div>
  )
}
