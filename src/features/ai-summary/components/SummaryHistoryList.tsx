// AI Summary History List
// EPIC 9 US-9.6: Browse past daily summaries with date picker and status filter.

import Link from 'next/link'
import { CheckCircle, XCircle, Clock, ChevronRight } from 'lucide-react'
import type { DailySummary } from '../types/summary'

interface SummaryHistoryListProps {
  summaries: DailySummary[]
}

function StatusIcon({ status }: { status: DailySummary['status'] }) {
  if (status === 'approved') return <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
  if (status === 'rejected') return <XCircle    className="h-4 w-4 text-red-400 shrink-0" />
  return <Clock className="h-4 w-4 text-amber-400 shrink-0" />
}

function statusLabel(status: DailySummary['status']) {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  return 'Draft'
}

export function SummaryHistoryList({ summaries }: SummaryHistoryListProps) {
  if (summaries.length === 0) {
    return (
      <p className="text-center text-zinc-500 text-sm py-12">
        No summaries have been generated yet.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
      {summaries.map((s) => {
        const tatMin = s.avgTatMs !== null
          ? `${Math.round(s.avgTatMs / 60_000)} min avg TAT`
          : null

        return (
          <li key={s.id}>
            <Link
              href={`/supervisor/summary?date=${s.summaryDate}`}
              className="flex items-center justify-between gap-4 px-4 py-3
                         hover:bg-zinc-800/60 transition-colors group"
            >
              {/* Left side */}
              <div className="flex items-center gap-3 min-w-0">
                <StatusIcon status={s.status} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-100 truncate">
                    {s.summaryDate}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {s.totalPatients} patient{s.totalPatients !== 1 ? 's' : ''}
                    {' · '}{s.totalTransitions} transitions
                    {tatMin ? ` · ${tatMin}` : ''}
                  </p>
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-zinc-400">{statusLabel(s.status)}</span>
                {s.confidenceScore !== null && (
                  <span className="text-xs text-zinc-500">{s.confidenceScore}%</span>
                )}
                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
