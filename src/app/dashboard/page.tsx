import { verifyActiveSession } from "@/shared/lib/active-session"
import { getBedGridData } from "@/features/bed-dashboard/actions/bed-grid-actions"
import { BedDashboardClient } from "@/features/bed-dashboard/components/BedDashboardClient"
import { createVirtualBed } from "@/features/bed-management/actions/virtual-bed-actions"
import { AlertTriangle } from "lucide-react"
import { LogoutButton } from "@/features/auth/components/LogoutButton"
import { KioskBanner } from "@/features/auth/components/KioskBanner"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
    const session = await verifyActiveSession()

    if (!session) {
        redirect('/login')
    }
    const bedGridResult = await getBedGridData()

    // Handle error state
    if (!bedGridResult.success || !bedGridResult.data) {
        return (
            <div className="min-h-screen bg-background text-foreground p-3 sm:p-8">
                {session.isKiosk && (
                    <KioskBanner username={session.username} kioskIp={session.kioskIp} />
                )}
                <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                Hello, {session?.username || 'Nurse'}
                            </h1>
                            <p className="text-muted-foreground text-sm">Real-time bed status and ward overview</p>
                        </div>
                        <div className="self-end sm:self-auto flex items-center gap-2">
                            <LogoutButton />
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-destructive bg-destructive/20 p-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <p className="text-destructive font-semibold mb-2">Failed to load bed data</p>
                    <p className="text-muted-foreground text-sm">{bedGridResult.error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-3 sm:p-8 transition-colors duration-300">
            {session.isKiosk && (
                <KioskBanner username={session.username} kioskIp={session.kioskIp} />
            )}
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

                {/* Bed Grid */}
                <BedDashboardClient
                    initialData={bedGridResult.data}
                    canRecordDispositionReasons={session.role !== 'housekeeping'}
                    onCreateVirtualBed={createVirtualBed}
                />
            </div>
        </div>
    )
}
