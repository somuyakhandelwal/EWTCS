import { verifyActiveSession } from "@/shared/lib/active-session"
import { BedDashboardContainer } from "@/features/bed-dashboard/components/BedDashboardContainer"
import { BedGridSkeleton } from "@/features/bed-dashboard/components/BedGridSkeleton"
import { LogoutButton } from "@/features/auth/components/LogoutButton"
import { KioskBanner } from "@/features/auth/components/KioskBanner"
import { FeedbackForm } from "@/features/adoption/components/FeedbackForm"
import { redirect } from "next/navigation"
import { Suspense } from "react"

export default async function DashboardPage() {
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
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" data-help-id="dashboard-header">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Hello, {session?.username || 'Nurse'}
                        </h1>
                        <p className="text-muted-foreground text-sm">Real-time bed status and ward overview</p>
                    </div>
                    <div className="self-end sm:self-auto flex items-center gap-4">
                        <LogoutButton />
                    </div>
                </div>

                {/* Bed Grid - Streamed */}
                <Suspense fallback={<BedGridSkeleton />}>
                    <BedDashboardContainer role={session.role} />
                </Suspense>

                {/* Feedback — hidden on kiosk sessions */}
                {!session.isKiosk && (
                    <div className="max-w-xl">
                        <FeedbackForm />
                    </div>
                )}
            </div>
        </div>
    )
}
