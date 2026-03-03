'use client'
// US-16.3: Online sync progress and completion banner.
// Shown when the browser is ONLINE and a sync is in progress or just finished.
// (The OfflineBanner handles the offline state; the two banners are mutually exclusive.)

import React, { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const AUTO_HIDE_SUCCESS_MS = 4000

export interface SyncResult {
  succeeded: number
  failed: number
  conflicts: number
}

interface SyncStatusBannerProps {
  /** True while a drain is executing */
  isDraining: boolean
  /** Number of operations still waiting in the queue */
  pendingCount: number
  /** Set after a drain completes; null means no recent sync result to show */
  syncResult: SyncResult | null
  /** Called when the user clicks "Retry" after a failed sync */
  onRetry?: () => void
}

export const SyncStatusBanner = React.memo(function SyncStatusBanner({
  isDraining,
  pendingCount,
  syncResult,
  onRetry,
}: SyncStatusBannerProps) {
  // Controls auto-hide of the success banner
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    if (!syncResult || isDraining) return
    setShowResult(true)
    // Auto-hide only for all-success results; failures stay until retried/resolved
    if (syncResult.failed === 0 && syncResult.conflicts === 0) {
      const t = setTimeout(() => setShowResult(false), AUTO_HIDE_SUCCESS_MS)
      return () => clearTimeout(t)
    }
  }, [syncResult, isDraining])

  if (isDraining) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400">
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
        <span className="text-sm font-semibold">
          Syncing {pendingCount} update{pendingCount !== 1 ? 's' : ''}…
        </span>
        <span className="ml-auto shrink-0 text-xs opacity-70 hidden sm:block">Please wait</span>
      </div>
    )
  }

  if (showResult && syncResult) {
    const hasIssues = syncResult.failed > 0 || syncResult.conflicts > 0
    const parts: string[] = []
    if (syncResult.succeeded > 0)
      parts.push(`${syncResult.succeeded} update${syncResult.succeeded !== 1 ? 's' : ''} synced`)
    if (syncResult.conflicts > 0)
      parts.push(`${syncResult.conflicts} conflict${syncResult.conflicts !== 1 ? 's' : ''} need resolution`)
    if (syncResult.failed > 0)
      parts.push(`${syncResult.failed} failed`)

    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-lg border',
          hasIssues
            ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
            : 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400',
        )}
      >
        {hasIssues
          ? <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          : <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />}
        <span className="text-sm font-semibold">{parts.join(' · ')}</span>
        {syncResult.failed > 0 && onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto shrink-0 text-xs font-medium underline hover:no-underline"
          >
            Retry failed
          </button>
        )}
      </div>
    )
  }

  return null
})
