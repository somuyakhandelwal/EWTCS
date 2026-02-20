'use server'
// Shift Override Server Action (US-8.2 AC-4)
// Epic 8: Shift Management
//
// Allows a supervisor or admin to manually reassign the shift tag on an
// existing bed_stage_log entry — e.g. during shift handover disputes.

import { query } from '@/shared/lib/db'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'

/**
 * Supervisor manually reassigns the shift on a bed stage log entry.
 * Sets shift_id and records which supervisor performed the override.
 */
export async function overrideLogShift(input: {
  logId: string
  shiftId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(['supervisor', 'admin'])

    await query(
      `UPDATE bed_stage_logs
       SET shift_id = $1,
           shift_override_by_user_id = $2
       WHERE id = $3`,
      [input.shiftId, session.userId, input.logId]
    )

    await logAudit({
      actionType: 'UPDATE',
      entityType: 'bed_stage_log_shift',
      entityId: input.logId,
      performedBy: session.userId,
      changes: { shiftId: input.shiftId },
    })

    logger.info('Log shift overridden', {
      logId: input.logId,
      shiftId: input.shiftId,
      by: session.userId,
    })
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    logger.error('overrideLogShift failed', err as Error)
    return { success: false, error: 'Failed to override shift' }
  }
}
