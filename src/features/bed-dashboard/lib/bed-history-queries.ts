import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

export interface BedHistoryLog {
    id: string
    bedId: string
    fromStageId: string | null
    toStageId: string
    changedByUserId: string
    transitionTime: Date
    durationInPreviousStageMs: number | null
    notes: string | null
    fromStageName: string | null
    toStageName: string
    changedByName: string
    latestCorrection: {
        id: string
        reason: string
        correctedFields: Record<string, any>
        correctedAt: Date
        correctedByName: string
    } | null
}

/** Get bed history with corrections */
export async function getBedHistoryFromDB(bedId: string): Promise<BedHistoryLog[]> {
    try {
        const result = await query<BedHistoryLog>(
            `
      SELECT 
        l.id,
        l.bed_id as "bedId",
        l.from_stage_id as "fromStageId",
        l.to_stage_id as "toStageId",
        l.changed_by_user_id as "changedByUserId",
        l.transition_time as "transitionTime",
        l.duration_in_previous_stage_ms as "durationInPreviousStageMs",
        l.notes,
        fs.name as "fromStageName",
        ts.name as "toStageName",
        ts.name as "toStageName",
        u.username as "changedByName",
        (
          SELECT jsonb_build_object(
              'id', c.id, 
              'reason', c.correction_reason, 
              'correctedFields', c.corrected_fields,
              'correctedAt', c.corrected_at,
              'correctedByName', cu.username
          )
          FROM bed_stage_log_corrections c
          JOIN users cu ON c.corrected_by_user_id = cu.id
          WHERE c.bed_stage_log_id = l.id
          ORDER BY c.corrected_at DESC
          LIMIT 1
        ) as "latestCorrection"
      FROM bed_stage_logs l
      LEFT JOIN stages fs ON l.from_stage_id = fs.id
      JOIN stages ts ON l.to_stage_id = ts.id
      JOIN users u ON l.changed_by_user_id = u.id
      WHERE l.bed_id = $1
      ORDER BY l.transition_time DESC
      `,
            [bedId]
        )

        return result.rows
    } catch (error) {
        logger.error('Failed to fetch bed history', error as Error, { bedId })
        throw new Error('Failed to fetch bed history')
    }
}

/** Get specific bed stage log by ID */
export async function getBedStageLogById(logId: string): Promise<BedHistoryLog | null> {
    try {
        const result = await query<BedHistoryLog>(
            `
      SELECT 
        l.id,
        l.bed_id as "bedId",
        l.from_stage_id as "fromStageId",
        l.to_stage_id as "toStageId",
        l.changed_by_user_id as "changedByUserId",
        l.transition_time as "transitionTime",
        l.duration_in_previous_stage_ms as "durationInPreviousStageMs",
        l.notes,
        fs.name as "fromStageName",
        ts.name as "toStageName",
        u.username as "changedByName"
      FROM bed_stage_logs l
      LEFT JOIN stages fs ON l.from_stage_id = fs.id
      JOIN stages ts ON l.to_stage_id = ts.id
      JOIN users u ON l.changed_by_user_id = u.id
      WHERE l.id = $1
      `,
            [logId]
        )

        return result.rows[0] || null
    } catch (error) {
        logger.error('Failed to fetch bed stage log', error as Error, { logId })
        throw new Error('Failed to fetch bed stage log')
    }
}
