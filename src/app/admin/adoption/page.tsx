import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { verifyActiveSession } from '@/shared/lib/active-session'
import { UsageMetricCards } from '@/features/adoption/components/UsageMetricCards'
import { UsageTrendChart } from '@/features/adoption/components/UsageTrendChart'
import { LowUsageAlert } from '@/features/adoption/components/LowUsageAlert'
import { MonthlyUsageTable } from '@/features/adoption/components/MonthlyUsageTable'
import { FeedbackList } from '@/features/adoption/components/FeedbackList'
import {
    fetchUsageMetrics,
    fetchLoginTrend,
    fetchMonthlyUsageSummary,
    fetchLowUsageUsers,
} from '@/features/adoption/lib/usage-queries'
import {
    fetchAllFeedback,
    fetchFeedbackStats,
} from '@/features/adoption/lib/feedback-queries'
import type { UsageMetrics } from '@/features/adoption/types'

export const dynamic = 'force-dynamic'

const EMPTY_METRICS: UsageMetrics = {
    loginsToday: 0,
    loginsThisWeek: 0,
    loginsThisMonth: 0,
    bedUpdatesToday: 0,
    bedUpdatesThisWeek: 0,
    bedUpdatesThisMonth: 0,
    reportsGeneratedThisMonth: 0,
    activeUsersThisMonth: 0,
    totalUsers: 0,
}

export default async function AdoptionPage() {
    const session = await verifyActiveSession()
    if (!session || session.role !== 'admin') {
        redirect('/login')
    }

    // Call DB query functions directly — page is already admin-protected above.
    // Bypassing the server-action layer avoids a second requireRole() call that
    // can silently swallow errors and return empty data.
    const [
        metrics,
        trend,
        monthly,
        lowUsers,
        feedback,
        fbStats,
    ] = await Promise.all([
        fetchUsageMetrics().catch(() => EMPTY_METRICS),
        fetchLoginTrend().catch(() => []),
        fetchMonthlyUsageSummary().catch(() => []),
        fetchLowUsageUsers(7).catch(() => []),
        fetchAllFeedback(50, 0).catch(() => []),
        fetchFeedbackStats().catch(() => ({ total: 0, avgRating: null, byCategory: {} as Record<string, number> })),
    ])

    return (
        <div className="min-h-screen bg-background text-foreground p-3 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin"
                        className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                        aria-label="Back to Admin"
                    >
                        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 border border-primary/20 rounded-full">
                            <TrendingUp className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                System Adoption
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Monitor staff usage — logins, updates, and engagement trends (US-18.7)
                            </p>
                        </div>
                    </div>
                </div>

                {/* KPI metric cards */}
                <UsageMetricCards metrics={metrics} />

                {/* 30-day trend chart */}
                <UsageTrendChart data={trend} />

                {/* Low usage alert — candidates for follow-up training */}
                <LowUsageAlert users={lowUsers} thresholdDays={7} />

                {/* Monthly usage table */}
                <MonthlyUsageTable data={monthly} />

                {/* User feedback */}
                <FeedbackList items={feedback} stats={fbStats} />

            </div>
        </div>
    )
}
