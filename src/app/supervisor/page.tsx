import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { ClipboardList, AlertTriangle, Clock } from "lucide-react"

import { verifyActiveSession } from "@/features/auth/lib/active-session"

export default async function SupervisorDashboard() {
    const session = await verifyActiveSession()

    return (
        <div className="min-h-screen bg-black text-foreground p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">
                            Supervisor {session?.username ? session.username : 'Overview'}
                        </h1>
                        <p className="text-zinc-400">Ward performance and incident reporting</p>
                    </div>
                    <div className="p-2 bg-amber-900/20 border border-amber-900/50 rounded-full">
                        <ClipboardList className="h-6 w-6 text-amber-500" />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-200">Pending Reviews</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">5</div>
                            <p className="text-xs text-zinc-500">Incidents require attention</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-200">Avg Response Time</CardTitle>
                            <Clock className="h-4 w-4 text-zinc-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">8m</div>
                            <p className="text-xs text-emerald-500">▼ 1m vs yesterday</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
