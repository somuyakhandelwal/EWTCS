'use server'
// archival-actions.ts — server actions for US-14.1
// EPIC 14: Data Retention & Archival
//
// triggerArchival: admin-only manual run.
// approveArchival: admin-only approval of a pending_approval cron run.
// fetchArchivalRuns: read access for admin + auditor.

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import { logAudit } from '@/shared/lib/audit'
import { query } from '@/shared/lib/db'
import { archiveTables } from '../lib/archival-runner'
import { getRetentionConfig } from '../lib/retention-config-queries'
import { getRecentArchivalRuns, getArchivalRunById } from '../lib/archival-queries'
import {
  createRunRecord,
  finaliseRunRecord,
  failRunRecord,
  collectResults,
  buildCutoffs,
} from '../lib/archival-run-helpers'
import type { ArchivalRun } from '../lib/data-retention-types'

export interface TriggerArchivalResult {
  success: boolean
  runId?: string
  rowsArchived?: Record<string, number>
  error?: string
}

export interface FetchArchivalRunsResult {
  success: boolean
  data?: ArchivalRun[]
  error?: string
}

// ── Actions ────────────────────────────────────────────────────────────────

/**
 * Manually trigger an archival run. Admin only.
 * Manual triggers bypass the approval gate — the click is the approval.
 */
export async function triggerArchival(): Promise<TriggerArchivalResult> {
  try {
    const session = await requireRole('admin')

    const config = await getRetentionConfig()
    const cutoffs = buildCutoffs(config)

    const runId = await createRunRecord(session.userId, cutoffs)

    logger.info('Manual archival run started', { runId, cutoffs, adminId: session.userId })

    const tableResults = await archiveTables(cutoffs)
    const { rowsArchived, errors } = collectResults(tableResults)

    if (errors.length > 0) {
      const errorMessage = errors.join('; ')
      await failRunRecord(runId, errorMessage)
      return { success: false, runId, rowsArchived, error: errorMessage }
    }

    await finaliseRunRecord(runId, rowsArchived)

    await logAudit({
      actionType: 'ARCHIVE',
      entityType: 'archival_run',
      entityId: runId,
      performedBy: session.userId,
      changes: { rowsArchived, cutoffs },
    })

    logger.info('Manual archival run completed', { runId, rowsArchived })

    return { success: true, runId, rowsArchived }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Archival failed'
    logger.error('triggerArchival failed', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Approve a pending_approval archival run and execute it. Admin only.
 * Used when requiresApproval = true and the cron created a pending run.
 */
export async function approveArchival(runId: string): Promise<TriggerArchivalResult> {
  try {
    const session = await requireRole('admin')

    const run = await getArchivalRunById(runId)
    if (!run) return { success: false, error: 'Archival run not found' }
    if (run.status !== 'pending_approval') {
      return { success: false, error: `Run is not pending approval (status: ${run.status})` }
    }

    await query(
      `UPDATE archival_runs SET status = 'running', triggered_by = $2 WHERE id = $1`,
      [runId, session.userId],
    )

    // Re-read current config to get per-table cutoffs.
    // The stored cutoff_date in the run record is the earliest of those cutoffs — used
    // only for display. We derive per-table dates from the live config so each table
    // respects its own retention period.
    const config = await getRetentionConfig()
    const cutoffs = buildCutoffs(config)

    const tableResults = await archiveTables(cutoffs)
    const { rowsArchived, errors } = collectResults(tableResults)

    if (errors.length > 0) {
      const errorMessage = errors.join('; ')
      await failRunRecord(runId, errorMessage)
      return { success: false, runId, rowsArchived, error: errorMessage }
    }

    await finaliseRunRecord(runId, rowsArchived)

    await logAudit({
      actionType: 'ARCHIVE_APPROVE',
      entityType: 'archival_run',
      entityId: runId,
      performedBy: session.userId,
      changes: { rowsArchived, cutoffs, storedCutoffDate: run.cutoffDate },
    })

    logger.info('Archival run approved and completed', { runId, rowsArchived })

    return { success: true, runId, rowsArchived }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Archival approval failed'
    logger.error('approveArchival failed', error as Error)
    return { success: false, error: message }
  }
}

/** Fetch the most recent archival run records. Accessible by admin + auditor. */
export async function fetchArchivalRuns(): Promise<FetchArchivalRunsResult> {
  try {
    await requireRole(['admin', 'auditor'])
    const data = await getRecentArchivalRuns(10)
    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch archival runs'
    logger.error('fetchArchivalRuns failed', error as Error)
    return { success: false, error: message }
  }
}
