import { ClipboardList } from "lucide-react"
import { LogoutButton } from "@/features/auth/components/LogoutButton"
import { KioskBanner } from "@/features/auth/components/KioskBanner"
import { redirect } from "next/navigation"
import { AlertTriangle } from "lucide-react"

import { verifyActiveSession } from "@/features/auth/lib/active-session"
import { getBedGridData } from "@/features/bed-dashboard/actions/bed-grid-actions"
import { SupervisorBedOverview } from "@/features/bed-dashboard/components/SupervisorBedOverview"

export default async function SupervisorDashboard() {
    const session = await verifyActiveSession()

    if (!session) {
        redirect('/login')
    }

    const bedGridResult = await getBedGridData()

    return (
        <div className="min-h-screen bg-black text-foreground p-3 sm:p-8">
            {session.isKiosk && (
                <KioskBanner username={session.username} kioskIp={session.kioskIp} />
            )}
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            Supervisor {session.username}
                        </h1>
                        <p className="text-zinc-400 text-sm">Ward performance and delay monitoring</p>
                    </div>
                    <div className="flex items-center gap-4 self-end sm:self-auto">
                        <div className="p-2 bg-amber-900/20 border border-amber-900/50 rounded-full">
                            <ClipboardList className="h-6 w-6 text-amber-500" />
                        </div>
                        <LogoutButton />
                    </div>
                </div>

                {bedGridResult.success && bedGridResult.data ? (
                    <SupervisorBedOverview initialData={bedGridResult.data} />
                ) : (
                    <div className="rounded-lg border border-red-800 bg-red-900/20 p-8 text-center">
                        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-300 font-semibold mb-2">Failed to load bed data</p>
                        <p className="text-zinc-400 text-sm">{bedGridResult.error}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
