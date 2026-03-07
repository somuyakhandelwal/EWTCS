// EPIC 13 — Performance & Reliability
// US-13.8: System Health Dashboard

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Activity, Database, Users, GitBranch, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { verifyActiveSession } from '@/features/auth/lib/active-session'
import { getHealthData } from '@/features/health/lib/health-queries'

function StatRow({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
            <span className="text-sm text-zinc-400">{label}</span>
            <span className={`text-sm font-semibold ${accent ?? 'text-white'}`}>{value}</span>
        </div>
    )
}

export default async function AdminHealthPage() {
    const session = await verifyActiveSession()
    if (!session) redirect('/login')
    if (session.role !== 'admin' && session.role !== 'auditor') redirect('/dashboard')

    const health = await getHealthData()

    const poolPct = health.pool.utilizationPct
    const poolColor = poolPct >= 80 ? 'text-red-400' : poolPct >= 60 ? 'text-yellow-400' : 'text-emerald-400'

    return (
        <div className="min-h-screen bg-black text-foreground p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Admin
                    </Link>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">System Health</h1>
                        <p className="text-zinc-400 mt-1">
                            Live infrastructure status &mdash; checked at{' '}
                            {new Date(health.checkedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                    </div>
                    <form action="/admin/health">
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800
                                       hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                    </form>
                </div>

                {/* Top KPI row */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                <Database className="h-4 w-4" /> DB Pool Usage
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${poolColor}`}>{poolPct}%</div>
                            <p className="text-xs text-zinc-500 mt-1">
                                {health.pool.total - health.pool.idle} active / {health.pool.max} max
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                <Activity className="h-4 w-4" /> Active Queries
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{health.db.activeConnections}</div>
                            <p className="text-xs text-zinc-500 mt-1">pg_stat_activity</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                <Users className="h-4 w-4" /> System Users
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{health.users.activeUsers}</div>
                            <p className="text-xs text-zinc-500 mt-1">active / {health.users.totalUsers} total</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                <GitBranch className="h-4 w-4" /> Migrations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{health.migrations.applied}</div>
                            <p className="text-xs text-zinc-500 mt-1">applied to DB</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Connection Pool detail */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-base text-white">Connection Pool</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <StatRow label="Max connections" value={health.pool.max} />
                            <StatRow label="Total in pool" value={health.pool.total} />
                            <StatRow label="Idle" value={health.pool.idle} accent="text-emerald-400" />
                            <StatRow label="Active" value={health.pool.total - health.pool.idle}
                                accent={health.pool.total - health.pool.idle > 0 ? 'text-blue-400' : 'text-zinc-400'} />
                            <StatRow label="Waiting" value={health.pool.waiting}
                                accent={health.pool.waiting > 0 ? 'text-yellow-400' : 'text-zinc-400'} />
                            <StatRow label="Utilisation" value={`${poolPct}%`} accent={poolColor} />
                        </CardContent>
                    </Card>

                    {/* Database detail */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-base text-white">Database</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <StatRow label="Database" value={health.db.databaseName} />
                            <StatRow label="Server" value={health.db.serverVersion} />
                            <StatRow label="Size on disk" value={health.db.dbSizeMb} />
                            <StatRow label="Active connections" value={health.db.activeConnections} />
                            <StatRow label="Idle connections" value={health.db.idleConnections} />
                            <StatRow label="Txns committed"
                                value={health.db.transactionsCommitted?.toString() ?? '—'} />
                            <StatRow label="Txns rolled back"
                                value={health.db.transactionsRolledBack?.toString() ?? '—'}
                                accent={Number(health.db.transactionsRolledBack ?? 0) > 0 ? 'text-yellow-400' : 'text-zinc-400'} />
                        </CardContent>
                    </Card>

                    {/* Users & Migrations */}
                    <div className="space-y-6">
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-base text-white">User Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <StatRow label="Admins" value={health.users.admins} />
                                <StatRow label="Supervisors" value={health.users.supervisors} />
                                <StatRow label="Nurses" value={health.users.nurses} />
                                <StatRow label="Active" value={health.users.activeUsers} accent="text-emerald-400" />
                                <StatRow label="Total" value={health.users.totalUsers} />
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-base text-white">Migrations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <StatRow label="Applied" value={health.migrations.applied} accent="text-emerald-400" />
                                <StatRow label="Last migration" value={health.migrations.lastMigration ?? '—'} />
                                {health.migrations.lastAppliedAt && (
                                    <StatRow
                                        label="Applied at"
                                        value={new Date(health.migrations.lastAppliedAt).toLocaleDateString('en-US', {
                                            year: 'numeric', month: 'short', day: 'numeric',
                                        })}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
