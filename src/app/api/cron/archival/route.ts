// /api/cron/archival — scheduled archival endpoint
// EPIC 14 — US-14.1: Archival runs automatically monthly
//
// Called by: Vercel Cron / system cron at  0 0 1 * *  (midnight on the 1st)
// Protected by: CRON_SECRET header — must match process.env.CRON_SECRET
//
// When retention_requires_approval = true:  creates a pending_approval run,
//   no data is moved until an admin approves it in the UI.
// When retention_requires_approval = false: archives immediately.

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/shared/config/logger'
import { query } from '@/shared/lib/db'
import { archiveTables } from '@/features/data-retention/lib/archival-runner'
import { getRetentionConfig } from '@/features/data-retention/lib/retention-config-queries'
import { buildCutoffs } from '@/features/data-retention/lib/archival-run-helpers'

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('CRON_SECRET env var not set — archival cron disabled')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Config ────────────────────────────────────────────────────────────
  const config = await getRetentionConfig()
  const cutoffs = buildCutoffs(config)
  // Earliest cutoff stored in the run record (for display only)
  const earliestCutoff = new Date(
    Math.min(cutoffs.patientAdmissions.getTime(), cutoffs.auditLogs.getTime()),
  )

  // ── Approval gate ─────────────────────────────────────────────────────
  if (config.requiresApproval) {
    const result = await query<{ id: string }>(
      `INSERT INTO archival_runs (triggered_by, status, cutoff_date)
       VALUES ('cron', 'pending_approval', $1)
       RETURNING id`,
      [earliestCutoff],
    )
    const runId = result.rows[0].id
    logger.info('Archival cron created pending_approval run', { runId, cutoffs })
    return NextResponse.json({ status: 'pending_approval', runId })
  }

  // ── Immediate run ─────────────────────────────────────────────────────
  const runResult = await query<{ id: string }>(
    `INSERT INTO archival_runs (triggered_by, status, cutoff_date)
     VALUES ('cron', 'running', $1)
     RETURNING id`,
    [earliestCutoff],
  )
  const runId = runResult.rows[0].id

  const tableResults = await archiveTables(cutoffs)
  const rowsArchived: Record<string, number> = {}
  const errors: string[] = []

  for (const r of tableResults) {
    rowsArchived[r.table] = r.rowsMoved
    if (r.error) errors.push(`${r.table}: ${r.error}`)
  }

  if (errors.length > 0) {
    const errorMessage = errors.join('; ')
    await query(
      `UPDATE archival_runs
       SET status = 'failed', ended_at = NOW(), error_message = $2
       WHERE id = $1`,
      [runId, errorMessage],
    )
    logger.error('Cron archival run failed', new Error(errorMessage), { runId })
    return NextResponse.json({ status: 'failed', runId, error: errorMessage }, { status: 500 })
  }

  await query(
    `UPDATE archival_runs
     SET status = 'completed', ended_at = NOW(), rows_archived = $2
     WHERE id = $1`,
    [runId, JSON.stringify(rowsArchived)],
  )

  logger.info('Cron archival run completed', { runId, rowsArchived })
  return NextResponse.json({ status: 'completed', runId, rowsArchived })
}
