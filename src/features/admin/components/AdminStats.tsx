import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Users, Activity, Settings } from 'lucide-react'

interface AdminUser {
    is_active: boolean
}

interface AdminLog {
    id: string
    action_type: string
    performed_by_username?: string | null
    target_username?: string | null
    created_at: string
}

interface AdminStatsProps {
    users: AdminUser[]
    recentLogs: AdminLog[]
}

export function AdminStats({ users, recentLogs }: AdminStatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-200">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-zinc-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{users.length}</div>
                    <p className="text-xs text-zinc-500">System accounts</p>
                </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-200">Active Users</CardTitle>
                    <Activity className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">
                        {users.filter((u) => u.is_active).length}
                    </div>
                    <p className="text-xs text-emerald-500">Can access system</p>
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
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-200">Recent Actions</CardTitle>
                    <Activity className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{recentLogs.length}</div>
                    <p className="text-xs text-zinc-500">Last 5 activities</p>
                </CardContent>
            </Card>
        </div>
    )
}
