// ArchivalRunsTable — shows recent archival run history with approve button
// EPIC 14 — US-14.1

'use client'

import { useTransition } from 'react'
import { CheckCircle, XCircle, Clock, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { approveArchival } from '../actions/archival-actions'
import type { ArchivalRun, ArchivalRunStatus } from '../lib/data-retention-types'

interface ArchivalRunsTableProps {
  runs: ArchivalRun[]
  onApproved?: () => void
}

const STATUS_ICON: Record<ArchivalRunStatus, React.ReactNode> = {
  completed:        <CheckCircle className="h-4 w-4 text-green-400" />,
  failed:           <XCircle className="h-4 w-4 text-red-400" />,
  running:          <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
  pending_approval: <Clock className="h-4 w-4 text-yellow-400" />,
}

const STATUS_LABEL: Record<ArchivalRunStatus, string> = {
  completed:        'Completed',
  failed:           'Failed',
  running:          'Running',
  pending_approval: 'Awaiting Approval',
}

function formatDate(d: Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function totalRowsArchived(rowsArchived: Record<string, number>): number {
  return Object.values(rowsArchived).reduce((sum, n) => sum + n, 0)
}

export function ArchivalRunsTable({ runs, onApproved }: ArchivalRunsTableProps) {
  const [isPending, startTransition] = useTransition()

  function handleApprove(runId: string) {
    startTransition(async () => {
      await approveArchival(runId)
      onApproved?.()
    })
  }

  if (runs.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-4 text-center">
        No archival runs yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800">
            <th className="pb-2 text-left font-medium">Started</th>
            <th className="pb-2 text-left font-medium">Cutoff date</th>
            <th className="pb-2 text-left font-medium">Status</th>
            <th className="pb-2 text-right font-medium">Rows archived</th>
            <th className="pb-2 text-left font-medium">Triggered by</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {runs.map((run) => (
            <tr key={run.id} className="text-zinc-300">
              <td className="py-2 pr-4 whitespace-nowrap">{formatDate(run.startedAt)}</td>
              <td className="py-2 pr-4 whitespace-nowrap">{formatDate(run.cutoffDate)}</td>
              <td className="py-2 pr-4">
                <span className="flex items-center gap-1.5">
                  {STATUS_ICON[run.status]}
                  <span className={cn(
                    run.status === 'failed' && 'text-red-400',
                    run.status === 'pending_approval' && 'text-yellow-400',
                  )}>
                    {STATUS_LABEL[run.status]}
                  </span>
                </span>
                {run.errorMessage && (
                  <p className="text-red-400 text-[10px] mt-0.5 max-w-[240px] truncate">
                    {run.errorMessage}
                  </p>
                )}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {run.status === 'completed' ? totalRowsArchived(run.rowsArchived).toLocaleString() : '—'}
              </td>
              <td className="py-2 pr-4 text-zinc-500 truncate max-w-[120px]">
                {run.triggeredBy === 'cron' ? 'Cron' : `Admin`}
              </td>
              <td className="py-2 text-right">
                {run.status === 'pending_approval' && (
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleApprove(run.id)}
                    className="h-6 px-2 text-[10px] bg-yellow-600 hover:bg-yellow-500 text-white"
                  >
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
