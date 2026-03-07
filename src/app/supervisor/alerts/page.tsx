// Supervisor Alert Screen Page
// EPIC 15: Notifications & Alerts (US-15.4)
// Route: /supervisor/alerts
// Role: supervisor, admin

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bell, ArrowLeft, BarChart2 } from 'lucide-react'
import { verifyActiveSession } from '@/features/auth/lib/active-session'
import { KioskBanner } from '@/features/auth/components/KioskBanner'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { getAlertsAction } from '@/features/alerts/actions/alert-actions'
import { AlertScreen } from '@/features/alerts/components/AlertScreen'

export const metadata = {
  title: 'Alert Screen — Supervisor',
}

export default async function SupervisorAlertsPage() {
  const session = await verifyActiveSession()

  if (!session) {
    redirect('/login')
  }

  if (session.role !== 'supervisor' && session.role !== 'admin') {
    redirect('/login')
  }

  const result = await getAlertsAction()
  const initialAlerts = result.success && result.alerts ? result.alerts : []

  return (
    <div className="min-h-screen bg-black text-foreground p-3 sm:p-8">
      {session.isKiosk && (
        <KioskBanner username={session.username} kioskIp={session.kioskIp} />
      )}

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/supervisor"
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Back to supervisor overview"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                <Bell className="h-6 w-6 text-red-400" />
                Alert Screen
              </h1>
              <p className="text-zinc-400 text-sm">
                Real-time ward alerts — delayed beds and disposition bottlenecks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end sm:self-auto">
            <Link
              href="/analytics"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-white text-sm font-medium transition-colors"
            >
              <BarChart2 className="h-4 w-4 text-blue-400" />
              Analytics
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* Alert screen (real-time client component) */}
        <AlertScreen initialAlerts={initialAlerts} />
      </div>
    </div>
  )
}
