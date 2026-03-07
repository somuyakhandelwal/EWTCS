'use server'

import { getBedById } from '../lib/queries'
import { logger } from '@/shared/config/logger'
import { UpdateBedStageSchema, type UpdateBedStageInput } from '../schemas/bed-schemas'
import { updateBedStageInDB } from '../lib/bed-mutations'
import { checkWardAccess } from '../lib/bed-queries'
import { requireWriteRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { validateTransition } from '../lib/stage-validation'
import { headers } from 'next/headers'
import { getClientIpFromHeaders } from '@/shared/lib/request-ip'
import { detectPii, redactPii } from '@/shared/lib/pii-detector'

/**
 * Update bed stage (US-2.1, US-2.2)
 * Validates stage transitions before updating
 *
 * COMPLIANCE: Stage updates are logged to audit_logs within a transaction.
 * This ensures audit logging cannot be skipped or fail silently.
 * All stage changes are traceable with user ID, IP address, and override status.
 * Fulfills EPIC 12 acceptance criteria: "All stage updates are logged"
 */
export async function updateBedStage(input: UpdateBedStageInput): Promise<{
  success: boolean
  data?: Awaited<ReturnType<typeof updateBedStageInDB>>
  error?: string
  reason?: string
  requiresOverride?: boolean
  errors?: Record<string, string[]>
  /** US-16.4: true when bed state changed since the client queued this operation */
  conflict?: boolean
  serverStageId?: string | null
}> {
  try {
    const session = await requireWriteRole('beds', {
      actionType: 'UPDATE',
      entityType: 'bed',
      entityId: input.bedId,
    })
    const requestHeaders = await headers()
    const ipAddress = getClientIpFromHeaders(requestHeaders)

    const result = UpdateBedStageSchema.safeParse(input)
    if (!result.success) {
      return {
        success: false,
        errors: result.error.flatten().fieldErrors,
      }
    }

    // US-17.7: Backend PII enforcement — reject if PII detected in free-text fields
    // This runs regardless of frontend validation to prevent bypass via direct API calls.
    const freeTextFields: Array<{ field: string; value: string | undefined }> = [
      { field: 'notes', value: result.data.notes },
      { field: 'overrideReason', value: result.data.overrideReason },
    ]
    for (const { field, value } of freeTextFields) {
      if (!value) continue
      const pii = detectPii(value)
      if (pii.hasPii) {
        await logAudit({
          actionType: 'PII_BLOCKED',
          entityType: 'bed',
          entityId: result.data.bedId,
          performedBy: session.userId,
          metadata: {
            field,
            detectedCategories: pii.summary,
            redactedValue: redactPii(value),
          },
        })
        logger.warn('PII detected and blocked in bed stage update', {
          userId: session.userId,
          bedId: result.data.bedId,
          field,
          categories: pii.summary,
        })
        return {
          success: false,
          error: `Field "${field}" contains patient information (${pii.summary}). Remove it before submitting.`,
        }
      }
    }

    // IDOR FIX: Ward-level access control (checkWardAccess in bed-queries.ts)
    const wardError = await checkWardAccess(session.userId, result.data.bedId, session.role)
    if (wardError) {
      logger.warn('Ward access denied', { userId: session.userId, bedId: result.data.bedId })
      return { success: false, error: wardError }
    }

    const bed = await getBedById(result.data.bedId)
    if (!bed) {
      return { success: false, error: 'Bed not found' }
    }

    // US-16.4: Conflict detection — bed may have been moved by another user while offline.
    // Compare expected stage (what client saw when queuing) vs actual current stage.
    if (result.data.expectedStageId && bed.currentStageId !== result.data.expectedStageId) {
      await logAudit({
        actionType: 'SYNC_CONFLICT',
        entityType: 'stage_transition',
        entityId: result.data.bedId,
        performedBy: session.userId,
        changes: {
          expectedStageId: result.data.expectedStageId,
          actualStageId: bed.currentStageId,
          enqueuedAt: result.data.enqueuedAt,
        },
      }).catch(() => {})
      return { success: false, conflict: true, serverStageId: bed.currentStageId ?? '' }
    }

    // Validate stage transition (US-2.2)
    const validationResult = await validateTransition(
      bed.currentStageId,
      result.data.toStageId,
      session.role as 'nurse' | 'supervisor' | 'admin' | 'housekeeping'
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
    // US-8.2: Pass shift override fields — supervisor can tag the log with a specific
    // shift instead of the auto-resolved one (e.g. during shift handover).
    const canOverrideShift = session.role === 'supervisor' || session.role === 'admin'
    const updateResult = await updateBedStageInDB({
      bedId: result.data.bedId,
      toStageId: result.data.toStageId,
      changedByUserId: session.userId,
      notes: result.data.notes,
      ipAddress,
      supervisorOverrideApplied: result.data.supervisorOverride,
      shiftOverrideId: canOverrideShift ? (result.data.shiftOverrideId ?? null) : null,
      shiftOverrideByUserId: canOverrideShift && result.data.shiftOverrideId ? session.userId : null,
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
