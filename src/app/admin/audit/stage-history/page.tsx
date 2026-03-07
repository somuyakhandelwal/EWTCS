// EPIC 12 — Audit Logs & Compliance
// US-12.2: Complete stage change history — filterable, paginated, exportable, read-only

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye } from 'lucide-react'
import { verifyActiveSession } from '@/features/auth/lib/active-session'
import {
    getStageHistoryPage,
    getBedAndStageOptions,
} from '@/features/audit-log/lib/stage-history-queries'
import { StageHistoryDashboard } from '@/features/audit-log/components/StageHistoryDashboard'
import { getStageHistoryAction } from '@/features/audit-log/actions/stage-history-actions'
import type { StageHistoryFilter } from '@/features/audit-log/lib/stage-history-queries'

export default async function StageHistoryPage() {
    const session = await verifyActiveSession()
    if (!session) redirect('/login')
    if (session.role !== 'admin' && session.role !== 'auditor') redirect('/dashboard')

    const [initialData, { beds, stages }] = await Promise.all([
        getStageHistoryPage({ page: 1, pageSize: 50 }),
        getBedAndStageOptions(),
    ])

    async function fetchAction(filter: StageHistoryFilter) {
        'use server'
        const result = await getStageHistoryAction(filter)
        return result.success && result.data ? result.data : null
    }

    const backHref = session.role === 'auditor' ? '/admin/audit' : '/admin/audit'

    return (
        <div className="min-h-screen bg-black text-foreground p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link href={backHref} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Audit Logs
                    </Link>
                </div>

                {session.role === 'auditor' && (
                    <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-amber-900/20 border border-amber-700/50 text-amber-300 text-sm">
                        <Eye className="h-4 w-4 flex-shrink-0" />
                        <span><strong>Audit Mode</strong> — read-only. No changes can be made from this view.</span>
                    </div>
                )}

                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Stage Change History</h1>
                    <p className="text-zinc-400 mt-1">
                        Complete record of all bed stage transitions across the system
                    </p>
                </div>

                <StageHistoryDashboard
                    initialData={initialData}
                    beds={beds}
                    stages={stages}
                    onFetch={fetchAction}
                />
            </div>
        </div>
    )
}
