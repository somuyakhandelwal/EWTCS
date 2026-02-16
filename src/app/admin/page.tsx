import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Users, Settings } from "lucide-react"

import { verifySession } from "@/lib/session"

export default async function AdminDashboard() {
    const session = await verifySession()

    return (
        <div className="min-h-screen bg-black text-foreground p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">
                            Admin {session?.username ? session.username : 'Console'}
                        </h1>
                        <p className="text-zinc-400">System configuration and user management</p>
                    </div>
                    <div className="p-2 bg-red-900/20 border border-red-900/50 rounded-full">
                        <Shield className="h-6 w-6 text-red-500" />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-200">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-zinc-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">3</div>
                            <p className="text-xs text-zinc-500">Active accounts</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-200">System Status</CardTitle>
                            <Settings className="h-4 w-4 text-zinc-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-500">Operational</div>
                            <p className="text-xs text-zinc-500">All services running</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
