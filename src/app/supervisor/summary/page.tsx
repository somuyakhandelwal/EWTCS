// Daily AI Summary Page — Supervisor View
// EPIC 9: US-9.1 (generate), US-9.2 (AI text), US-9.3/9.5 (review/approve/reject)
// Route: /supervisor/summary
// Optional query param: ?date=YYYY-MM-DD (default: yesterday)

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { History, RefreshCw, FileText } from 'lucide-react'
import { verifyActiveSession } from '@/features/auth/lib/active-session'
import { getSummaryByDateAction } from '@/features/ai-summary/actions/summary-actions'
import { SummaryCard } from '@/features/ai-summary/components/SummaryCard'
import { SummaryReviewForm } from '@/features/ai-summary/components/SummaryReviewForm'
import { GenerateSummaryButton } from '@/features/ai-summary/components/GenerateSummaryButton'

function yesterday(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

interface PageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function SummaryPage({ searchParams }: PageProps) {
  const session = await verifyActiveSession()
  if (!session) redirect('/login')

  const params = await searchParams
  const date   = params.date ?? yesterday()

  const result = await getSummaryByDateAction(date)
  const summary = result.success ? (result.summary ?? null) : null

  return (
    <div className="min-h-screen bg-black text-foreground p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-5 w-5 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Daily Summary</h1>
            </div>
            <p className="text-zinc-400 text-sm">
              AI-generated ED performance narrative · {date}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/supervisor/summary/history"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                         border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200
                         transition-colors"
            >
              <History className="h-4 w-4" /> History
            </Link>
            <Link
              href="/supervisor"
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Generate / Regenerate button */}
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
          <RefreshCw className="h-4 w-4 text-zinc-500 shrink-0" />
          <p className="text-sm text-zinc-400 flex-1">
            {summary
              ? 'A summary exists for this date. You can regenerate it (draft status only).'
              : 'No summary generated yet for this date.'}
          </p>
          <GenerateSummaryButton
            date={date}
            canRegenerate={summary?.status === 'draft' || !summary}
          />
        </div>

        {/* Summary display */}
        {summary ? (
          <div className="space-y-6">
            <SummaryCard summary={summary} />

            {/* Review form — only shown for draft summaries */}
            {summary.status === 'draft' && summary.aiText && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-3">
                <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">
                  Review &amp; Approve
                </h2>
                <p className="text-xs text-zinc-500">
                  Edit the AI narrative if needed, then approve or reject it.
                  Only approved summaries are visible to other supervisors.
                </p>
                <SummaryReviewForm summary={summary} />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
            <FileText className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">
              No summary for {date}. Click &ldquo;Generate&rdquo; to create one.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
