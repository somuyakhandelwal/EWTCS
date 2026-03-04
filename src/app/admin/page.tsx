import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Shield, Users, Settings, Activity } from "lucide-react"
import { LogoutButton } from "@/features/auth/components/LogoutButton"
import { redirect } from "next/navigation"
import { AdminRecentActivity } from './components/AdminRecentActivity'
import { AdminQuickActions } from "./components/AdminQuickActions"

import { verifyActiveSession } from "@/shared/lib/active-session"
import { getAllUsers, getUserLogs } from "@/features/user-management/actions/user-management-actions"
import { getWards } from "@/features/user-management/lib/queries"
import UserManagementTable from "@/features/user-management/components/UserManagementTable"
import CreateUserDialog from "@/features/user-management/components/CreateUserDialog"
import { KioskSessionsPanel } from "@/features/user-management/components/KioskSessionsPanel"
import { DailySummaryTrigger } from "@/features/ai-summary/components/DailySummaryTrigger"
import { DailySummaryHistory } from "@/features/ai-summary/components/DailySummaryHistory"

export default async function AdminDashboard() {
    const session = await verifyActiveSession()

    if (!session) {
        redirect('/api/auth/force-logout')
    }
    const usersResult = await getAllUsers()
    const logsResult = await getUserLogs()
    const wards = await getWards()

    const users = usersResult.success ? usersResult.users : []
    const recentLogs = logsResult.success ? logsResult.logs.slice(0, 5) : []

    return (
        <div className="min-h-screen bg-background text-foreground p-3 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between" data-help-id="admin-header">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Admin {session?.username ? session.username : 'Console'}
                        </h1>
                        <p className="text-muted-foreground">System configuration and user management</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-full">
                            <Shield className="h-6 w-6 text-destructive" />
                        </div>
                        <LogoutButton />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-card-foreground">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{users.length}</div>
                            <p className="text-xs text-muted-foreground">System accounts</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-card-foreground">Active Users</CardTitle>
                            <Activity className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                                {users.filter((u: { is_active: boolean }) => u.is_active).length}
                            </div>
                            <p className="text-xs text-muted-foreground">Can access system</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-card-foreground">System Status</CardTitle>
                            <Settings className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">Operational</div>
                            <p className="text-xs text-muted-foreground">All services running</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-card-foreground">Recent Actions</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{recentLogs.length}</div>
                            <p className="text-xs text-muted-foreground">Last 5 activities</p>
                        </CardContent>
                    </Card>
                </div>

                <AdminQuickActions />

                {/* User Management Section */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
                            <div>
                                <CardTitle className="text-xl text-foreground">User Management</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Create, edit, and manage system users
                                </p>
                            </div>
                            <CreateUserDialog wards={wards} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <UserManagementTable users={users} wards={wards} />
                    </CardContent>
                </Card>

                {/* Kiosk Sessions — US-5.3 */}
                <KioskSessionsPanel />

                {/* AI Daily Summaries — EPIC 9 */}
                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
                        <div>
                            <CardTitle className="text-xl text-foreground">Daily AI Summaries</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Automated operational reports and performance metrics (read-only)
                            </p>
                        </div>
                        <DailySummaryTrigger />
                    </CardHeader>
                    <CardContent>
                        <DailySummaryHistory />
                    </CardContent>
                </Card>

                {/* Recent Activity Log */}
                <AdminRecentActivity recentLogs={recentLogs} />
            </div>
        </div>
    )
}
