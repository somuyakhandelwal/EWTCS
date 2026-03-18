// OT Room Occupancy Dashboard Page
// EPIC 23: Operation Theatre (OT) Tracking Module (US-23.1)

import { verifyActiveSession } from '@/shared/lib/active-session'
import { OTDashboardContainer } from '@/features/ot-dashboard/components/OTDashboardContainer'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

function OTSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border-2 border-border bg-muted/20 p-4 h-28 animate-pulse"
        />
      ))}
    </div>
  )
}

export default async function OTDashboardPage() {
  const session = await verifyActiveSession()

  if (!session) {
    redirect('/api/auth/force-logout')
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/20 border border-blue-900/50 rounded-lg">
              <Activity className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                OT Room Occupancy
              </h1>
              <p className="text-muted-foreground text-sm">
                Real-time status of all 16 Operation Theatre rooms
              </p>
            </div>
          </div>
          <div className="self-end sm:self-auto flex items-center gap-4">
            <LogoutButton />
          </div>
        </div>

        {/* OT Dashboard */}
        <Suspense fallback={<OTSkeleton />}>
          <OTDashboardContainer />
        </Suspense>

      </div>
    </div>
  )
}
