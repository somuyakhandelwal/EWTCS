// EPIC 12 — Audit Logs & Compliance
// US-12.1: As an admin I can view, filter, paginate and export a complete audit trail
// US-12.3: Auditor (read-only) role can access this page

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, History } from 'lucide-react'
import { verifyActiveSession } from '@/features/auth/lib/active-session'
import { getAuditLogPage, getAuditEntityTypes } from '@/shared/lib/audit'
import { AuditLogDashboard } from '@/features/audit-log/components/AuditLogDashboard'

export default async function AdminAuditPage() {
    const session = await verifyActiveSession()
    if (!session) redirect('/login')
    if (session.role !== 'admin' && session.role !== 'auditor') redirect('/dashboard')

    const [initialData, entityTypes] = await Promise.all([
        getAuditLogPage({ page: 1, pageSize: 50 }),
        getAuditEntityTypes(),
    ])

    return (
        <div className="min-h-screen bg-black text-foreground p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link
                        href={session.role === 'auditor' ? '/admin/audit' : '/admin'}
                        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {session.role === 'auditor' ? 'Audit Home' : 'Back to Admin'}
                    </Link>
                </div>

                {/* US-12.3: Audit mode banner */}
                {session.role === 'auditor' && (
                    <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-amber-900/20 border border-amber-700/50 text-amber-300 text-sm">
                        <Eye className="h-4 w-4 flex-shrink-0" />
                        <span><strong>Audit Mode</strong> — read-only access. No changes can be made from this view.</span>
                    </div>
                )}

                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Audit Logs</h1>
                        <p className="text-zinc-400 mt-1">
                            Complete tamper-evident log of all user actions across the system
                        </p>
                    </div>
                    <Link
                        href="/admin/audit/stage-history"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
                    >
                        <History className="h-4 w-4" />
                        Stage Change History
                    </Link>
                </div>

                <AuditLogDashboard initialData={initialData} entityTypes={entityTypes} />
            </div>
        </div>
    )
}
