'use server'

import { getBedById } from '../lib/queries'
import { logger } from '@/shared/config/logger'
import { UpdateBedStageSchema, type UpdateBedStageInput } from '../schemas/bed-schemas'
import { updateBedStageInDB } from '../lib/bed-mutations'
import { checkWardAccess } from '../lib/bed-queries'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { validateTransition } from '../lib/stage-validation'

/**
 * Update bed stage (US-2.1, US-2.2)
 * Validates stage transitions before updating
 */
export async function updateBedStage(input: UpdateBedStageInput): Promise<{
  success: boolean
  data?: Awaited<ReturnType<typeof updateBedStageInDB>>
  error?: string
  reason?: string // Why transition wasn't allowed or why override is needed
  requiresOverride?: boolean // If true, transition needs supervisor approval
  errors?: Record<string, string[]>
}> {
  try {
    const session = await requireRole(['nurse', 'supervisor', 'admin'])

    const result = UpdateBedStageSchema.safeParse(input)
    if (!result.success) {
      return {
        success: false,
        errors: result.error.flatten().fieldErrors,
      }
    }

    // IDOR FIX: Ward-level access control (checkWardAccess in bed-queries.ts)
    const wardError = await checkWardAccess(session.userId, result.data.bedId, session.role)
    if (wardError) {
      logger.warn('Ward access denied', { userId: session.userId, bedId: result.data.bedId })
      return { success: false, error: wardError }
    }

    // NEW: Get current bed to validate transition
    const bed = await getBedById(result.data.bedId)
    if (!bed) {
      return {
        success: false,
        error: 'Bed not found',
      }
    }

    // NEW: Validate stage transition (US-2.2)
    const validationResult = await validateTransition(
      bed.currentStageId,
      result.data.toStageId,
      session.role as 'nurse' | 'supervisor' | 'admin'
    )

    // NEW: If transition is invalid, return error with reason
    if (!validationResult.isValid) {
      logger.info('Stage transition rejected', {
        bedId: result.data.bedId,
        fromStageId: bed.currentStageId,
        toStageId: result.data.toStageId,
        userRole: session.role,
        reason: validationResult.reason,
      })
      return {
        success: false,
        error: 'Invalid stage transition',
        reason: validationResult.reason,
      }
    }

    // NEW: If supervisor override is required but not provided, return error with flag
    if (validationResult.requiresSupervisorOverride && !result.data.supervisorOverride) {
      logger.info('Supervisor override required but not provided', {
        bedId: result.data.bedId,
        fromStageId: bed.currentStageId,
        toStageId: result.data.toStageId,
        userRole: session.role,
      })
      return {
        success: false,
        error: 'Supervisor override required for this transition',
        reason: validationResult.reason,
        requiresOverride: true, // Signal client to show override modal
      }
    }

    // NEW: Log supervisor override if used
    if (result.data.supervisorOverride && validationResult.requiresSupervisorOverride) {
      await logAudit({
        actionType: 'SUPERVISOR_OVERRIDE',
        entityType: 'stage_transition',
        entityId: result.data.bedId,
        performedBy: session.userId,
        changes: {
          fromStageId: bed.currentStageId,
          toStageId: result.data.toStageId,
          overrideReason: result.data.overrideReason || 'Medical decision',
        },
      })

      logger.info('Supervisor override applied', {
        bedId: result.data.bedId,
        fromStageId: bed.currentStageId,
        toStageId: result.data.toStageId,
        overriddenBy: session.userId,
        reason: result.data.overrideReason,
      })
    }

    // Proceed with update
    const updateResult = await updateBedStageInDB({
      bedId: result.data.bedId,
      toStageId: result.data.toStageId,
      changedByUserId: session.userId,
      notes: result.data.notes,
    })

    // BUG FIX #7: Log audit AFTER update with error handling
    // If audit logging fails, still consider update successful (graceful degradation)
    // but log the audit failure for compliance team to investigate
    try {
      await logAudit({
        actionType: 'UPDATE',
        entityType: 'bed',
        entityId: updateResult.bedId,
        performedBy: session.userId,
        changes: {
          fromStageId: updateResult.fromStageId,
          toStageId: updateResult.toStageId,
          isOccupied: updateResult.isOccupied,
          supervisorOverrideApplied: result.data.supervisorOverride,
        },
      })
    } catch (auditError) {
      // BUG FIX #7: Log audit failure for compliance investigation
      logger.error('CRITICAL: Audit logging failed - potential compliance issue', auditError as Error, {
        bedId: updateResult.bedId,
        userId: session.userId,
        stageTransition: `${updateResult.fromStageId} → ${updateResult.toStageId}`,
      })
      // Still return success since bed WAS updated - audit failure is secondary
    }

    return {
      success: true,
      data: updateResult,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update bed stage'
    logger.error('Failed to update bed stage', error as Error)
    return {
      success: false,
      error: message,
    }
  }
}
