import { verifyActiveSession } from "@/features/auth/lib/active-session"
import { getBedGridData } from "@/features/bed-dashboard/actions/bed-grid-actions"
import { BedDashboardClient } from "@/features/bed-dashboard/components/BedDashboardClient"
import { AlertTriangle } from "lucide-react"
import { LogoutButton } from "@/features/auth/components/LogoutButton"
import { KioskBanner } from "@/features/auth/components/KioskBanner"
import { HelpDrawer } from "@/components/ui/HelpDrawer"
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
            <div className="min-h-screen bg-black text-foreground p-3 sm:p-8">
                {session.isKiosk && (
                    <KioskBanner username={session.username} kioskIp={session.kioskIp} />
                )}
                <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                Hello, {session?.username || 'Nurse'}
                            </h1>
                            <p className="text-zinc-400 text-sm">Real-time bed status and ward overview</p>
                        </div>
                    </div>

                    <div className="rounded-lg border border-red-800 bg-red-900/20 p-8 text-center">
                        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-300 font-semibold mb-2">Failed to load bed data</p>
                        <p className="text-zinc-400 text-sm">{bedGridResult.error}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-foreground p-3 sm:p-8">
            {session.isKiosk && (
                <KioskBanner username={session.username} kioskIp={session.kioskIp} />
            )}
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            Hello, {session?.username || 'Nurse'}
                        </h1>
                        <p className="text-zinc-400 text-sm">Real-time bed status and ward overview</p>
                    </div>
                    <div className="self-end sm:self-auto flex items-center gap-2">
                        <HelpDrawer title="Bed Dashboard Help">
                            <p className="font-medium text-white">How to use the Bed Dashboard</p>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Each card represents one bed. <strong className="text-white">Tap a card</strong> to update its stage.</li>
                                <li>A <span className="text-red-400">red pulsing border</span> means the bed has been occupied longer than the delay threshold (3 hours by default).</li>
                                <li>An <span className="text-amber-400">amber pulsing border</span> signals a disposition bottleneck — the patient has been in &quot;Decision Made&quot; for over 30 minutes.</li>
                                <li>The connection badge (top-right) shows live update status. Use <strong className="text-white">Reconnect</strong> if it shows Disconnected.</li>
                                <li>Use <strong className="text-white">Supervisor Override</strong> when changing a stage outside normal workflow — a reason is required.</li>
                            </ul>
                            <p className="text-zinc-400 text-xs pt-2">Need more help? Contact your ward supervisor.</p>
                        </HelpDrawer>
                        <LogoutButton />
                    </div>
                </div>

                {/* Bed Grid */}
                <BedDashboardClient initialData={bedGridResult.data} />
            </div>
        </div>
    )
}
