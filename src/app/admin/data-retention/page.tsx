// EPIC 14 — Data Retention & Archival
// US-14.1: Archive old data to keep active table fast
// US-14.2: Configurable retention policy per entity type

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Archive } from 'lucide-react'
import { verifyActiveSession } from '@/features/auth/lib/active-session'
import { getRetentionPolicies, getArchiveStats } from '@/features/data-retention/lib/retention-queries'
import { DataRetentionDashboard } from '@/features/data-retention/components/DataRetentionDashboard'

export default async function DataRetentionPage() {
    const session = await verifyActiveSession()
    if (!session) redirect('/login')
    if (session.role !== 'admin') redirect('/dashboard')

    const [policies, stats] = await Promise.all([
        getRetentionPolicies(),
        getArchiveStats(),
    ])

    return (
        <div className="min-h-screen bg-black text-foreground p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Admin
                    </Link>
                </div>

                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Data Retention</h1>
                    <p className="text-zinc-400 mt-1">
                        Configure retention policies and archive old records to maintain database performance.
                    </p>
                </div>

                {/* US-14.3: Link to archive viewer */}
                <Link
                    href="/admin/data-retention/archive"
                    className="flex items-center gap-3 rounded-xl border border-amber-700/40 bg-amber-900/10
                               px-4 py-3 hover:bg-amber-900/20 transition-colors"
                >
                    <Archive className="h-5 w-5 text-amber-400 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-amber-300">Browse Archived Records</p>
                        <p className="text-xs text-zinc-500">Search and export historical bed stage logs from the archive (US-14.3)</p>
                    </div>
                </Link>

                <DataRetentionDashboard policies={policies} stats={stats} />
            </div>
        </div>
    )
}
