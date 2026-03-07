// Usage Metrics Admin Page
// US-18.7: Ensure Active System Usage — adoption dashboard for admins

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Activity, BarChart2, FileText, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { verifyActiveSession } from '@/features/auth/lib/active-session'
import { getUsageMetrics } from '@/features/admin/lib/usage-metrics-queries'

function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'text-white',
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  accent?: string
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">{label}</CardTitle>
        <Icon className="h-4 w-4 text-zinc-500" />
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${accent}`}>{value}</div>
        <p className="text-xs text-zinc-500 mt-1">Last 30 days</p>
      </CardContent>
    </Card>
  )
}

function roleBadge(role: string) {
  const map: Record<string, string> = {
    admin: 'bg-red-900/40 text-red-300',
    supervisor: 'bg-amber-900/40 text-amber-300',
    nurse: 'bg-blue-900/40 text-blue-300',
    auditor: 'bg-purple-900/40 text-purple-300',
  }
  const cls = map[role] ?? 'bg-zinc-800 text-zinc-300'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {role}
    </span>
  )
}

export default async function UsageMetricsPage() {
  const session = await verifyActiveSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/dashboard')

  const metrics = await getUsageMetrics()

  return (
    <div className="min-h-screen bg-black text-foreground p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Admin
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Usage Metrics</h1>
            <p className="text-zinc-400 text-sm">System adoption and activity — last 30 days</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Logins" value={metrics.loginsLast30Days} icon={Users} accent="text-blue-400" />
          <StatCard label="Stage Updates" value={metrics.stageUpdatesLast30Days} icon={Activity} accent="text-emerald-400" />
          <StatCard label="Report Events" value={metrics.reportsViewedLast30Days} icon={FileText} accent="text-amber-400" />
          <StatCard label="Active Users" value={metrics.activeUsersLast30Days} icon={BarChart2} accent="text-purple-400" />
        </div>

        {/* Daily Trend */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-zinc-400" />
              Daily Activity — Last 14 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.dailyLogins.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4">No activity data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left">
                      <th className="pb-2 text-zinc-400 font-medium">Date</th>
                      <th className="pb-2 text-zinc-400 font-medium text-right">Logins</th>
                      <th className="pb-2 text-zinc-400 font-medium text-right">Stage Updates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.dailyLogins.map((row) => (
                      <tr key={row.date} className="border-b border-zinc-800/50 last:border-0">
                        <td className="py-2 text-zinc-300">{row.date}</td>
                        <td className="py-2 text-right text-blue-300">{row.logins}</td>
                        <td className="py-2 text-right text-emerald-300">{row.stageUpdates}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-400" />
              Top Users by Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topUsers.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4">No user activity recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left">
                      <th className="pb-2 text-zinc-400 font-medium">User</th>
                      <th className="pb-2 text-zinc-400 font-medium">Role</th>
                      <th className="pb-2 text-zinc-400 font-medium text-right">Logins</th>
                      <th className="pb-2 text-zinc-400 font-medium text-right">Updates</th>
                      <th className="pb-2 text-zinc-400 font-medium text-right">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.topUsers.map((u) => (
                      <tr key={u.userId} className="border-b border-zinc-800/50 last:border-0">
                        <td className="py-2 text-white font-medium">{u.username}</td>
                        <td className="py-2">{roleBadge(u.role)}</td>
                        <td className="py-2 text-right text-blue-300">{u.logins}</td>
                        <td className="py-2 text-right text-emerald-300">{u.stageUpdates}</td>
                        <td className="py-2 text-right text-zinc-400 flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
