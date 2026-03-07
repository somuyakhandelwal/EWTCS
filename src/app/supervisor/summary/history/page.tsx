// Summary History Page — Supervisor View
// EPIC 9 US-9.6: Browse past daily summaries
// Route: /supervisor/summary/history

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, ChevronLeft } from 'lucide-react'
import { verifyActiveSession } from '@/features/auth/lib/active-session'
import { listSummariesAction } from '@/features/ai-summary/actions/summary-actions'
import { SummaryHistoryList } from '@/features/ai-summary/components/SummaryHistoryList'

export default async function SummaryHistoryPage() {
  const session = await verifyActiveSession()
  if (!session) redirect('/login')

  const result = await listSummariesAction(60)
  const summaries = result.success ? (result.summaries ?? []) : []

  return (
    <div className="min-h-screen bg-black text-foreground p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Summary History</h1>
              <p className="text-zinc-400 text-sm">All past daily ED summaries</p>
            </div>
          </div>
          <Link
            href="/supervisor/summary"
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Today
          </Link>
        </div>

        {/* Error banner */}
        {!result.success && (
          <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            {result.error ?? 'Failed to load summaries'}
          </div>
        )}

        <SummaryHistoryList summaries={summaries} />
      </div>
    </div>
  )
}
