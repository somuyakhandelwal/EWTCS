'use server'

import { logger } from '@/shared/config/logger'
import { CorrectBedStageLogSchema, type CorrectBedStageLogInput } from '../schemas/bed-schemas'
import { insertBedStageLogCorrection } from '../lib/bed-mutations'
import { getBedStageLogById, getBedWard, getUserWard, getBedHistoryFromDB, type BedHistoryLog } from '../lib/bed-queries'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'

/**
 * Get history for a specific bed
 */
export async function getBedHistory(bedId: string): Promise<{
    success: boolean
    data?: BedHistoryLog[]
    error?: string
}> {
    try {
        await requireRole(['nurse', 'supervisor', 'admin'])
        // Optional: Check ward access here if strict read access is required

        const history = await getBedHistoryFromDB(bedId)
        return { success: true, data: history }
    } catch (error) {
        logger.error('Failed to get bed history', error as Error)
        return { success: false, error: 'Failed to fetch history' }
    }
}

/**
 * Correct a bed stage log entry (US-7.1)
 * Supervisors only
 */
export async function correctBedStageLog(input: CorrectBedStageLogInput): Promise<{
    success: boolean
    error?: string
    errors?: Record<string, string[]>
}> {
    try {
        const session = await requireRole(['supervisor', 'admin'])

        const result = CorrectBedStageLogSchema.safeParse(input)
        if (!result.success) {
            return {
                success: false,
                errors: result.error.flatten().fieldErrors,
            }
        }

        // Verify log exists
        const log = await getBedStageLogById(result.data.logId)
        if (!log) {
            return {
                success: false,
                error: 'Log entry not found',
            }
        }

        // Check ward access (IDOR protection)
        // Supervisors can only correct logs for beds in their ward
        const userWard = await getUserWard(session.userId)
        const bedWard = await getBedWard(log.bedId)

        const hasWardAccess =
            (!userWard && !bedWard) ||
            (userWard && bedWard && userWard === bedWard) ||
            session.role === 'admin'

        if (!hasWardAccess) {
            logger.warn('Unauthorized log correction attempt', {
                userId: session.userId,
                logId: result.data.logId,
                bedId: log.bedId,
                userWard,
                bedWard
            })
            return {
                success: false,
                error: 'You do not have permission to correct logs for this bed.',
            }
        }

        // Prepare corrected fields
        const correctedFields: Record<string, any> = {}
        if (result.data.newDuration) correctedFields.duration = result.data.newDuration
        if (result.data.newNotes) correctedFields.notes = result.data.newNotes

        if (Object.keys(correctedFields).length === 0) {
            return {
                success: false,
                error: 'No corrections provided',
            }
        }

        await insertBedStageLogCorrection({
            logId: result.data.logId,
            correctedByUserId: session.userId,
            reason: result.data.reason,
            correctedFields
        })

        // Log the action itself in the main audit log
        await logAudit({
            actionType: 'UPDATE',
            entityType: 'bed_stage_log',
            entityId: log.id,
            performedBy: session.userId,
            changes: {
                correctionReason: result.data.reason,
                correctedFields
            },
            reason: result.data.reason
        })

        logger.info('Bed stage log corrected', {
            logId: log.id,
            userId: session.userId,
            reason: result.data.reason
        })

        return { success: true }

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to correct bed stage log'
        logger.error('Failed to correct bed stage log', error as Error)
        return {
            success: false,
            error: message,
        }
    }
}
