import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Shield, Users, Settings, Activity } from "lucide-react"
import { LogoutButton } from "@/features/auth/components/LogoutButton"
import { redirect } from "next/navigation"

import { verifyActiveSession } from "@/features/auth/lib/active-session"
import { getAllUsers, getUserLogs } from "@/features/user-management/actions/user-management-actions"
import UserManagementTable from "@/features/user-management/components/UserManagementTable"
import CreateUserDialog from "@/features/user-management/components/CreateUserDialog"

export default async function AdminDashboard() {
    const session = await verifyActiveSession()

    if (!session) {
        redirect('/login')
    }
    const usersResult = await getAllUsers()
    const logsResult = await getUserLogs()

    const users = usersResult.success ? usersResult.users : []
    const recentLogs = logsResult.success ? logsResult.logs.slice(0, 5) : []

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
                    <div className="flex items-center gap-6">
                        <div className="p-2 bg-red-900/20 border border-red-900/50 rounded-full">
                            <Shield className="h-6 w-6 text-red-500" />
                        </div>
                        <LogoutButton />
                    </div>
                </div>

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
                                {users.filter((u: { is_active: boolean }) => u.is_active).length}
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

                {/* User Management Section */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl text-white">User Management</CardTitle>
                                <p className="text-sm text-zinc-400 mt-1">
                                    Create, edit, and manage system users
                                </p>
                            </div>
                            <CreateUserDialog />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <UserManagementTable users={users} />
                    </CardContent>
                </Card>

                {/* Recent Activity Log */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-xl text-white">Recent Activity</CardTitle>
                        <p className="text-sm text-zinc-400 mt-1">
                            Latest user management actions
                        </p>
                    </CardHeader>
                    <CardContent>
                        {recentLogs.length > 0 ? (
                            <div className="space-y-2">
                                {recentLogs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-zinc-800"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-2 w-2 rounded-full ${log.action_type === 'CREATE' ? 'bg-green-500' :
                                                log.action_type === 'UPDATE' ? 'bg-blue-500' :
                                                    log.action_type === 'DEACTIVATE' ? 'bg-red-500' :
                                                        'bg-yellow-500'
                                                }`} />
                                            <div>
                                                <p className="text-sm text-white">
                                                    <span className="font-medium">{log.performed_by_username || 'System'}</span>
                                                    {' '}{log.action_type.toLowerCase()}d{' '}
                                                    <span className="font-medium">{log.target_username || 'entity'}</span>
                                                </p>
                                                <p className="text-xs text-zinc-500">
                                                    {new Date(log.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-zinc-500 uppercase">
                                            {log.action_type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-zinc-500 text-center py-8">No recent activity</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
