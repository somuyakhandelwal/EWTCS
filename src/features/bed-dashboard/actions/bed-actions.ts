'use server'

import { getBedById } from '../lib/queries'
import { logger } from '@/shared/config/logger'
import { UpdateBedStageSchema, type UpdateBedStageInput } from '../schemas/bed-schemas'
import { updateBedStageInDB } from '../lib/bed-mutations'
import { getUserWard, getBedWard } from '../lib/bed-queries'
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

    // IDOR FIX: Verify user has access to this specific bed (ward-level access control)
    const userWard = await getUserWard(session.userId)
    const bedWard = await getBedWard(result.data.bedId)

    // Allow access if:
    // 1. Neither user nor bed has a ward assigned (ward system not configured)
    // 2. Both have ward assignments and they match
    // 3. User is an admin (admins can access all beds)
    const hasWardAccess =
      (!userWard && !bedWard) ||
      (userWard && bedWard && userWard === bedWard) ||
      session.role === 'admin'

    if (!hasWardAccess) {
      logger.warn('Unauthorized bed access attempt', {
        userId: session.userId,
        bedId: result.data.bedId,
        userWard,
        bedWard,
        userRole: session.role,
      })
      return {
        success: false,
        error: 'You do not have permission to update this bed. Access is restricted to your assigned ward.',
      }
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
