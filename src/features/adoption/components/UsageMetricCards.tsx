import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Users, LogIn, Activity, FileText } from 'lucide-react'
import type { UsageMetrics } from '@/features/adoption/types'

interface UsageMetricCardsProps {
    metrics: UsageMetrics
}

interface KpiCardProps {
    title: string
    today?: number
    week?: number
    month: number
    icon: React.ReactNode
    accent: string
}

function KpiCard({ title, today, week, month, icon, accent }: KpiCardProps) {
    return (
        <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-card-foreground">{title}</CardTitle>
                <div className={`p-1.5 rounded-full ${accent}`}>{icon}</div>
            </CardHeader>
            <CardContent className="space-y-1">
                <div className="text-2xl font-bold text-foreground">{month.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">This month</p>
                {week != null && (
                    <p className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">{week.toLocaleString()}</span> this week
                        {today != null && (
                            <> · <span className="text-foreground font-medium">{today.toLocaleString()}</span> today</>
                        )}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

export function UsageMetricCards({ metrics }: UsageMetricCardsProps) {
    const adoptionPct = metrics.totalUsers > 0
        ? Math.round((metrics.activeUsersThisMonth / metrics.totalUsers) * 100)
        : 0

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
                title="User Logins"
                today={metrics.loginsToday}
                week={metrics.loginsThisWeek}
                month={metrics.loginsThisMonth}
                icon={<LogIn className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                accent="bg-blue-100 dark:bg-blue-900/30"
            />
            <KpiCard
                title="Bed Stage Updates"
                today={metrics.bedUpdatesToday}
                week={metrics.bedUpdatesThisWeek}
                month={metrics.bedUpdatesThisMonth}
                icon={<Activity className="h-4 w-4 text-green-600 dark:text-green-400" />}
                accent="bg-green-100 dark:bg-green-900/30"
            />
            <KpiCard
                title="Reports Generated"
                month={metrics.reportsGeneratedThisMonth}
                icon={<FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                accent="bg-purple-100 dark:bg-purple-900/30"
            />
            <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-card-foreground">Active Users</CardTitle>
                    <div className="p-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30">
                        <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-1">
                    <div className="text-2xl font-bold text-foreground">
                        {metrics.activeUsersThisMonth}
                        <span className="text-sm font-normal text-muted-foreground ml-1">/ {metrics.totalUsers}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {adoptionPct}% adoption rate this month
                    </p>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                        <div
                            className="bg-orange-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${adoptionPct}%` }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
