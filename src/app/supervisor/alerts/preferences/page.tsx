// Notification Preferences Page
// EPIC 15: Notifications & Alerts (US-15.5)
// Route: /supervisor/alerts/preferences
// Role: supervisor, admin

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings, ArrowLeft } from 'lucide-react'
import { verifyActiveSession } from '@/features/auth/lib/active-session'
import { KioskBanner } from '@/features/auth/components/KioskBanner'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { getNotificationPreferencesAction } from '@/features/notifications/actions/notification-preference-actions'
import { NotificationPreferencesForm } from '@/features/notifications/components/NotificationPreferencesForm'
import { DEFAULT_USER_PREFERENCES } from '@/features/notifications/types/notification-preferences'

export const metadata = {
  title: 'Notification Preferences — Supervisor',
}

export default async function NotificationPreferencesPage() {
  const session = await verifyActiveSession()

  if (!session) {
    redirect('/login')
  }

  if (session.role !== 'supervisor' && session.role !== 'admin') {
    redirect('/login')
  }

  const result = await getNotificationPreferencesAction()
  const preferences =
    result.success && result.preferences ? result.preferences : DEFAULT_USER_PREFERENCES

  return (
    <div className="min-h-screen bg-black text-foreground p-3 sm:p-8">
      {session.isKiosk && (
        <KioskBanner username={session.username} kioskIp={session.kioskIp} />
      )}

      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/supervisor/alerts"
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Back to alert screen"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                <Settings className="h-6 w-6 text-zinc-400" />
                Notification Preferences
              </h1>
              <p className="text-zinc-400 text-sm">
                Choose which alerts you receive and set custom thresholds.
              </p>
            </div>
          </div>
          <div className="self-end sm:self-auto">
            <LogoutButton />
          </div>
        </div>

        {/* Explanation card */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400 space-y-1">
          <p>
            <span className="font-medium text-zinc-200">Alert types</span> — enable or
            disable each category of alert for your account.
          </p>
          <p>
            <span className="font-medium text-zinc-200">Min. delay threshold</span> — optionally
            override the system-wide minimum elapsed time before an alert appears on your screen.
            Leave blank to use the global default.
          </p>
          <p>
            Preferences are saved per-user and audited. Use{' '}
            <span className="font-medium text-zinc-200">Reset to Defaults</span> to restore all
            settings.
          </p>
        </div>

        {/* Form */}
        <NotificationPreferencesForm initialPreferences={preferences} />
      </div>
    </div>
  )
}
