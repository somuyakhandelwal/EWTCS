// US-14.3: Retrieve Historical Archived Data
// Route: /admin/data-retention/archive

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Archive, ChevronLeft } from 'lucide-react'
import { requireRole } from '@/shared/lib/auth'
import { searchArchive } from '@/features/data-retention/lib/retention-queries'
import { ArchiveViewer } from '@/features/data-retention/components/ArchiveViewer'
import pool from '@/shared/lib/db'

async function getBeds() {
    const { rows } = await pool.query<{ id: string; bed_number: string; ward_name: string | null }>(
        `SELECT id, bed_number, ward_name FROM beds WHERE is_active = true ORDER BY bed_number`
    )
    return rows.map((r) => ({ id: r.id, bedNumber: r.bed_number, wardName: r.ward_name }))
}

export default async function ArchiveSearchPage() {
    let session
    try {
        session = await requireRole(['admin', 'auditor'])
    } catch {
        redirect('/login')
    }

    const [initialData, beds] = await Promise.all([
        searchArchive({ pageSize: 50 }),
        getBeds(),
    ])

    return (
        <div className="min-h-screen bg-black text-foreground p-4 sm:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Archive className="h-6 w-6 text-amber-400" />
                        <div>
                            <h1 className="text-2xl font-bold text-white">Archived Records</h1>
                            <p className="text-zinc-400 text-sm">
                                Historical bed stage transition log · US-14.3
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/admin/data-retention"
                        className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" /> Data Retention
                    </Link>
                </div>

                {/* Audit mode banner for auditor role */}
                {session.role === 'auditor' && (
                    <div className="rounded-lg bg-amber-900/20 border border-amber-700/40 px-4 py-2">
                        <p className="text-sm text-amber-300">
                            <span className="font-semibold">Read-Only Audit Access</span> — you can search and export archived records.
                        </p>
                    </div>
                )}

                <ArchiveViewer initialData={initialData} beds={beds} />
            </div>
        </div>
    )
}
