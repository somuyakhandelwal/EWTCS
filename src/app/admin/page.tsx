import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Shield } from "lucide-react"
import { LogoutButton } from "@/features/auth/components/LogoutButton"
import { HelpDrawer } from "@/components/ui/HelpDrawer"
import { redirect } from "next/navigation"

import { verifyActiveSession } from "@/features/auth/lib/active-session"
import { getAllUsers, getUserLogs } from "@/features/user-management/actions/user-management-actions"
import { getWards } from "@/features/user-management/lib/queries"
import UserManagementTable from "@/features/user-management/components/UserManagementTable"
import CreateUserDialog from "@/features/user-management/components/CreateUserDialog"
import { KioskSessionsPanel } from "@/features/user-management/components/KioskSessionsPanel"
import { AdminQuickActions } from "@/features/admin/components/AdminQuickActions"
import { AdminStats } from "@/features/admin/components/AdminStats"
import { AdminRecentActivity } from "@/features/admin/components/AdminRecentActivity"

export default async function AdminDashboard() {
    const session = await verifyActiveSession()

    if (!session) {
        redirect('/login')
    }
    const usersResult = await getAllUsers()
    const logsResult = await getUserLogs()
    const wards = await getWards()

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
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-900/20 border border-red-900/50 rounded-full">
                            <Shield className="h-6 w-6 text-red-500" />
                        </div>
                        <HelpDrawer title="Admin Console Help">
                            <p className="font-medium text-white">Admin Console Overview</p>
                            <ul className="space-y-2 list-disc list-inside">
                                <li><strong className="text-white">User Management</strong> — Create, edit, deactivate staff accounts and assign ward access.</li>
                                <li><strong className="text-white">Bed Configuration</strong> — Add, rename, or deactivate beds and assign ward groupings.</li>
                                <li><strong className="text-white">Reports</strong> — View TAT metrics, stage delay analytics, and sign off daily reports.</li>
                                <li><strong className="text-white">Audit Logs</strong> — Review a full tamper-evident trail of all system actions.</li>
                                <li><strong className="text-white">System Health</strong> — Monitor database and service connectivity.</li>
                                <li><strong className="text-white">Data Retention</strong> — Archive old records and search historical data.</li>
                                <li><strong className="text-white">Import Data</strong> — Upload historical CSV records to the archive.</li>
                            </ul>
                            <p className="text-zinc-400 text-xs pt-2">Admin actions are fully audit-logged.</p>
                        </HelpDrawer>
                        <LogoutButton />
                    </div>
                </div>

                <AdminStats users={users} recentLogs={recentLogs} />

                <AdminQuickActions />

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
                            <CreateUserDialog wards={wards} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <UserManagementTable users={users} wards={wards} />
                    </CardContent>
                </Card>

                {/* Kiosk Sessions — US-5.3 */}
                <KioskSessionsPanel />

                <AdminRecentActivity recentLogs={recentLogs} />
            </div>
        </div>
    )
}
