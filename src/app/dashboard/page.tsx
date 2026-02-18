import { verifyActiveSession } from "@/features/auth/lib/active-session"
import { getBedGridData } from "@/features/bed-dashboard/actions/bed-grid-actions"
import { BedDashboardClient } from "@/features/bed-dashboard/components/BedDashboardClient"
import { AlertTriangle } from "lucide-react"
import { LogoutButton } from "@/features/auth/components/LogoutButton"
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
            <div className="min-h-screen bg-black text-foreground p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white">
                                Hello, {session?.username || 'Nurse'}
                            </h1>
                            <p className="text-zinc-400">Real-time bed status and ward overview</p>
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
        <div className="min-h-screen bg-black text-foreground p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">
                            Hello, {session?.username || 'Nurse'}
                        </h1>
                        <p className="text-zinc-400">Real-time bed status and ward overview</p>
                    </div>
                    <LogoutButton />
                </div>

                {/* Bed Grid */}
                <BedDashboardClient initialData={bedGridResult.data} />
            </div>
        </div>
    )
}
