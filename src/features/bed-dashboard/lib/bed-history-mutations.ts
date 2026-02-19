import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

export interface CorrectBedStageLogParams {
    logId: string
    correctedByUserId: string
    reason: string
    correctedFields: Record<string, any>
}

/**
 * Records a correction to a historical bed stage log.
 * 
 * Instead of modifying the original immutable log entry, this function
 * creates a new record in the `bed_stage_log_corrections` table.
 * This ensures that the audit trail is preserved and that the original data
 * is always available for reference.
 * 
 * The correction record includes:
 * - Reference to the original log entry
 * - ID of the supervisor making the correction
 * - Mandatory reason for the correction
 * - JSON object containing the corrected field values (e.g., duration, notes)
 * 
 * @param {CorrectBedStageLogParams} params - The correction details
 * @returns {Promise<void>}
 */
export async function insertBedStageLogCorrection(
    params: CorrectBedStageLogParams
): Promise<void> {
    const { logId, correctedByUserId, reason, correctedFields } = params

    try {
        await pool.query(
            `
      INSERT INTO bed_stage_log_corrections (
        bed_stage_log_id,
        corrected_by_user_id,
        correction_reason,
        corrected_fields
      ) VALUES ($1, $2, $3, $4)
      `,
            [logId, correctedByUserId, reason, JSON.stringify(correctedFields)]
        )
    } catch (error) {
        logger.error('Failed to insert bed stage log correction', error as Error, { logId })
        throw error
    }
}
