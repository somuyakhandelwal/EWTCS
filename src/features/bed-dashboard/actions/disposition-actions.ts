'use server'
// Disposition Delay Reason Action - Epic 1: Nurse Desk Bed Dashboard (US-1.6)
// Separated to keep bed-actions.ts under the 200-line file limit

import { logger } from '@/shared/config/logger'
import { getUserWard, getBedWard } from '../lib/bed-queries'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import pool from '@/shared/lib/db'
import type { DispositionDelayReason } from '../types/bed'

/**
 * Record a reason for a disposition bottleneck (US-1.6)
 * Called when a nurse selects a delay reason for a patient stuck in Decision Made
 */
export async function recordDispositionDelayReason(input: {
  bedId: string
  reason: DispositionDelayReason
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(['nurse', 'supervisor', 'admin'])

    // Ward-level access check (same IDOR pattern as updateBedStage)
    const userWard = await getUserWard(session.userId)
    const bedWard = await getBedWard(input.bedId)
    const hasWardAccess =
      (userWard && bedWard && userWard === bedWard) || session.role === 'admin'

    if (!hasWardAccess) {
      logger.warn('Unauthorized disposition reason record attempt', {
        userId: session.userId,
        bedId: input.bedId,
      })
      return { success: false, error: 'Access denied to this bed.' }
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Find the most recent bed_stage_log entry for this bed entering Decision Made
      const logResult = await client.query<{ id: string }>(
        `SELECT bsl.id
         FROM bed_stage_logs bsl
         JOIN stages s ON bsl.to_stage_id = s.id
         WHERE bsl.bed_id = $1 AND s.name = 'Decision Made'
         ORDER BY bsl.transition_time DESC
         LIMIT 1`,
        [input.bedId]
      )
      const bedStageLogId = logResult.rows[0]?.id ?? null

      // Close any existing open reason for this bed, then insert the new one
      await client.query(
        `UPDATE disposition_delay_reasons
         SET resolved_at = NOW()
         WHERE bed_id = $1 AND resolved_at IS NULL`,
        [input.bedId]
      )

      await client.query(
        `INSERT INTO disposition_delay_reasons
           (bed_id, bed_stage_log_id, reason, notes, recorded_by_user_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [input.bedId, bedStageLogId, input.reason, input.notes ?? null, session.userId]
      )

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    await logAudit({
      actionType: 'UPDATE',
      entityType: 'disposition_delay_reason',
      entityId: input.bedId,
      performedBy: session.userId,
      changes: { reason: input.reason, notes: input.notes },
    })

    logger.info('Disposition delay reason recorded', {
      bedId: input.bedId,
      reason: input.reason,
      recordedBy: session.userId,
    })

    return { success: true }
  } catch (error) {
    logger.error('Failed to record disposition delay reason', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record delay reason',
    }
  }
}
