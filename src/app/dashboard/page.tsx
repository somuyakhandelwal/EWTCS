import { verifyActiveSession } from "@/features/auth/lib/active-session"
import { getBedGridData } from "@/features/bed-dashboard/actions/bed-actions"
import { BedDashboardClient } from "@/features/bed-dashboard/components/BedDashboardClient"
import { AlertTriangle } from "lucide-react"

export default async function DashboardPage() {
    const session = await verifyActiveSession()
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
                    <div className="flex items-center gap-2">
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-sm font-medium text-emerald-500">System Live</span>
                    </div>
                </div>

                {/* Bed Grid */}
                <BedDashboardClient initialData={bedGridResult.data} />
            </div>
        </div>
    )
}
