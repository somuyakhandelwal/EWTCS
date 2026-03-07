// Admin Shift Management Page
// EPIC 8: Shift Management (US-8.1)
// Route: /admin/shifts

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, ArrowLeft } from 'lucide-react'
import { verifyActiveSession } from '@/features/auth/lib/active-session'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { getShiftsAction } from '@/features/shifts/actions/shift-actions'
import { ShiftsManager } from '@/features/shifts/components/ShiftsManager'

export const metadata = {
  title: 'Shift Management — Admin',
}

export default async function AdminShiftsPage() {
  const session = await verifyActiveSession()

  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/admin')

  const result = await getShiftsAction()
  const shifts = result.success && result.shifts ? result.shifts : []

  return (
    <div className="min-h-screen bg-black text-foreground p-3 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Back to admin console"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                <Clock className="h-6 w-6 text-blue-400" />
                Shift Schedules
              </h1>
              <p className="text-zinc-400 text-sm">
                Define ward shifts — each bed stage update is tagged with the active shift.
              </p>
            </div>
          </div>
          <div className="self-end sm:self-auto">
            <LogoutButton />
          </div>
        </div>

        {/* Explainer */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400 space-y-1">
          <p>
            <span className="font-medium text-zinc-200">Default shifts</span> — Morning (06:00–14:00),
            Evening (14:00–22:00), Night (22:00–06:00).
          </p>
          <p>
            Every bed stage transition is automatically tagged with the shift that was active
            at the time of the change. Shift data is used in the{' '}
            <Link href="/analytics" className="text-blue-400 hover:underline">
              Analytics
            </Link>{' '}
            dashboard for shift-wise comparisons.
          </p>
        </div>

        <ShiftsManager initialShifts={shifts} />
      </div>
    </div>
  )
}
