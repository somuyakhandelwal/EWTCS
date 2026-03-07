// Historical Data Import Page
// US-11.5: Import historical data from existing systems
// Route: /admin/import

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Upload, ChevronLeft } from 'lucide-react'
import { verifyActiveSession } from '@/features/auth/lib/active-session'
import { HistoricalImportForm } from '@/features/import/components/HistoricalImportForm'

export default async function ImportPage() {
    const session = await verifyActiveSession()
    if (!session) redirect('/login')
    if (session.role !== 'admin') redirect('/dashboard')

    return (
        <div className="min-h-screen bg-black text-foreground p-4 sm:p-8">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Upload className="h-6 w-6 text-blue-400" />
                        <div>
                            <h1 className="text-2xl font-bold text-white">Import Historical Data</h1>
                            <p className="text-zinc-400 text-sm">
                                Upload a CSV file to import historical bed stage records (US-11.5)
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/admin"
                        className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" /> Admin
                    </Link>
                </div>

                <HistoricalImportForm />
            </div>
        </div>
    )
}
