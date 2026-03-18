import { verifyActiveSession } from '@/shared/lib/active-session'
import { BedDashboardContainer } from '@/features/bed-dashboard/components/BedDashboardContainer'
import { BedGridSkeleton } from '@/features/bed-dashboard/components/BedGridSkeleton'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { KioskBanner } from '@/features/auth/components/KioskBanner'
import { NurseAreaSidebar } from '@/features/bed-dashboard/components/NurseAreaSidebar'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default async function TriagePage() {
  const session = await verifyActiveSession()

  if (!session) {
    redirect('/api/auth/force-logout')
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-8 transition-colors duration-300">
      {session.isKiosk && (
        <KioskBanner username={session.username} kioskIp={session.kioskIp} />
      )}

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Triage Area Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">
              Dedicated 6-bed intake area for initial assessment and prioritization
            </p>
          </div>
          <div className="self-end sm:self-auto flex items-center gap-4">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Triage Unit
            </span>
            <LogoutButton />
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <NurseAreaSidebar activeArea="triage" />

          <div className="min-w-0 flex-1 rounded-xl border border-primary/20 bg-primary/5 p-2 sm:p-3">
            <Suspense fallback={<BedGridSkeleton />}>
              <BedDashboardContainer role={session.role} areaView="triage" />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
