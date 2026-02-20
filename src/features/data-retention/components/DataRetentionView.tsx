// DataRetentionView — top-level assembly panel for EPIC 14
// Combines: retention config form (US-14.2) + archival run history + manual trigger (US-14.1)
// Rendered on the analytics/admin page; admin-only write, auditor read-only.

'use client'

import { useState, useTransition } from 'react'
import { Archive, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { RetentionConfigForm } from './RetentionConfigForm'
import { ArchivalRunsTable } from './ArchivalRunsTable'
import { triggerArchival, fetchArchivalRuns } from '../actions/archival-actions'
import type { ArchivalRun, RetentionConfig } from '../lib/data-retention-types'

interface DataRetentionViewProps {
  initialConfig: RetentionConfig
  initialRuns: ArchivalRun[]
  readOnly?: boolean
  className?: string
}

export function DataRetentionView({
  initialConfig,
  initialRuns,
  readOnly = false,
  className,
}: DataRetentionViewProps) {
  const [runs, setRuns] = useState<ArchivalRun[]>(initialRuns)
  const [triggerFeedback, setTriggerFeedback] = useState<string | null>(null)
  const [isTriggerPending, startTriggerTransition] = useTransition()
  const [isRefreshPending, startRefreshTransition] = useTransition()

  function handleTrigger() {
    setTriggerFeedback(null)
    startTriggerTransition(async () => {
      const result = await triggerArchival()
      if (result.success) {
        const total = Object.values(result.rowsArchived ?? {}).reduce((s, n) => s + n, 0)
        setTriggerFeedback(`Done — ${total.toLocaleString()} rows archived.`)
      } else {
        setTriggerFeedback(result.error ?? 'Archival failed.')
      }
      // Refresh run list
      const fresh = await fetchArchivalRuns()
      if (fresh.success && fresh.data) setRuns(fresh.data)
    })
  }

  function handleRefresh() {
    startRefreshTransition(async () => {
      const fresh = await fetchArchivalRuns()
      if (fresh.success && fresh.data) setRuns(fresh.data)
    })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* ── Retention configuration (US-14.2) ── */}
      {!readOnly && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Archive className="h-4 w-4 text-zinc-400" />
              Data Retention Settings
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Set how long each data type is kept before being moved to the archive.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionConfigForm initialConfig={initialConfig} />
          </CardContent>
        </Card>
      )}

      {/* ── Archival history + manual trigger (US-14.1) ── */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Archive className="h-4 w-4 text-zinc-400" />
                Archival History
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Runs automatically on the 1st of each month.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleRefresh}
                disabled={isRefreshPending}
                className="text-zinc-500 hover:text-zinc-200 h-7 px-2">
                <RefreshCw className={cn('h-3.5 w-3.5', isRefreshPending && 'animate-spin')} />
              </Button>
              {!readOnly && (
                <Button size="sm" onClick={handleTrigger} disabled={isTriggerPending}
                  className="h-7 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs">
                  {isTriggerPending ? 'Running…' : 'Run Now'}
                </Button>
              )}
            </div>
          </div>
          {triggerFeedback && (
            <p className="text-xs text-blue-400 mt-1">{triggerFeedback}</p>
          )}
        </CardHeader>
        <CardContent>
          <ArchivalRunsTable runs={runs} onApproved={handleRefresh} />
        </CardContent>
      </Card>
    </div>
  )
}
