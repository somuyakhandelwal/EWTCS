// AI Summary Card
// EPIC 9 US-9.3: Display a daily summary with its stats, AI text, and approval status.

import { CheckCircle, XCircle, Clock } from 'lucide-react'
import type { DailySummary } from '../types/summary'

interface SummaryCardProps {
  summary: DailySummary
}

function StatusPill({ status }: { status: DailySummary['status'] }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-900/40 border border-green-700 text-green-300">
        <CheckCircle className="h-3 w-3" /> Approved
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-900/40 border border-red-800 text-red-300">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-900/40 border border-amber-700 text-amber-300">
      <Clock className="h-3 w-3" /> Draft
    </span>
  )
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const colour =
    score >= 80 ? 'text-green-400 bg-green-900/30 border-green-800' :
    score >= 50 ? 'text-amber-400 bg-amber-900/30 border-amber-800' :
                  'text-red-400 bg-red-900/30 border-red-800'
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${colour}`}>
      {score}% confidence
    </span>
  )
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-zinc-100 mt-0.5">{value}</span>
    </div>
  )
}

export function SummaryCard({ summary }: SummaryCardProps) {
  const tatMin = summary.avgTatMs !== null
    ? `${Math.round(summary.avgTatMs / 60_000)} min`
    : '—'
  const delayPct = `${(summary.delayRate * 100).toFixed(1)}%`
  const displayText = summary.status === 'approved'
    ? (summary.reviewedText ?? summary.aiText)
    : summary.aiText

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Daily Summary</p>
          <p className="text-lg font-bold text-white">{summary.summaryDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge score={summary.confidenceScore} />
          <StatusPill status={summary.status} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-lg bg-zinc-800/60 px-4 py-3">
        <StatItem label="Patients"          value={summary.totalPatients} />
        <StatItem label="Transitions"       value={summary.totalTransitions} />
        <StatItem label="Avg TAT"           value={tatMin} />
        <StatItem label="Delayed"           value={summary.delayedTransitions} />
        <StatItem label="Delay rate"        value={delayPct} />
        <StatItem label="Beds used"         value={summary.bedsUsed} />
      </div>

      {/* AI-generated narrative */}
      {displayText ? (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">
            {summary.status === 'approved' ? 'Approved narrative' : 'AI-generated draft'}
          </p>
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
            {displayText}
          </p>
        </div>
      ) : (
        <p className="text-sm text-zinc-500 italic">
          No AI narrative available for this date.
        </p>
      )}

      {/* Supervisor notes */}
      {summary.supervisorNotes && (
        <div className="rounded-md bg-blue-950/30 border border-blue-800/40 px-3 py-2">
          <p className="text-xs text-blue-400 font-medium mb-1">Supervisor notes</p>
          <p className="text-sm text-zinc-300">{summary.supervisorNotes}</p>
        </div>
      )}

      {/* Rejection reason */}
      {summary.status === 'rejected' && summary.rejectionReason && (
        <div className="rounded-md bg-red-950/30 border border-red-800/40 px-3 py-2">
          <p className="text-xs text-red-400 font-medium mb-1">
            Rejected by {summary.rejectedBy}
          </p>
          <p className="text-sm text-zinc-300">{summary.rejectionReason}</p>
        </div>
      )}

      {/* Approved attribution */}
      {summary.status === 'approved' && summary.approvedBy && (
        <p className="text-xs text-zinc-500">
          Approved by <span className="text-zinc-300">{summary.approvedBy}</span>
          {summary.approvedAt && (
            <> on {new Date(summary.approvedAt).toLocaleString()}</>
          )}
        </p>
      )}

      {/* AI model attribution */}
      {summary.aiModel && (
        <p className="text-xs text-zinc-600">Generated by {summary.aiModel}</p>
      )}
    </div>
  )
}
