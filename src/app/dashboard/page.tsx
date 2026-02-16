import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Users, Clock, AlertTriangle } from "lucide-react"

import { verifySession } from "@/lib/session"

export default async function DashboardPage() {
    const session = await verifySession()

    return (
        <div className="min-h-screen bg-black text-foreground p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">
                            Hello, {session?.username ? session.username : 'Nurse'}
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

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-200">Total Beds</CardTitle>
                            <Activity className="h-4 w-4 text-zinc-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">40</div>
                            <p className="text-xs text-zinc-500">Capacity</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-200">Occupied</CardTitle>
                            <Users className="h-4 w-4 text-zinc-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">32</div>
                            <p className="text-xs text-zinc-500">80% Full</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-200">Avg Wait Time</CardTitle>
                            <Clock className="h-4 w-4 text-zinc-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">12m</div>
                            <p className="text-xs text-emerald-500">▼ 2m from last hour</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-200">Critical Alerts</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">3</div>
                            <p className="text-xs text-red-500">Requires attention</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
                    <p className="text-zinc-500">Bed grid visualization coming in next update...</p>
                </div>
            </div>
        </div>
    )
}
