'use server'
// Bed Transition Server Action (US-2.2)
// Extracted from bed-grid-actions.ts to keep that file within the 200-line budget.

import { getAllStages, getBedById } from '../lib/queries'
import { logger } from '@/shared/config/logger'
import { getUserWard, getBedAccessInfo } from '../lib/bed-queries'
import { requireRole } from '@/shared/lib/auth'
import { categorizeStagesForTransition } from '../lib/stage-validation'

/**
 * Get valid stage transitions for a specific bed (US-2.2)
 * Returns categorized stages for UI display (allowed, requires override, invalid)
 */
export async function getValidTransitionsForBed(bedId: string): Promise<{
  success: boolean
  allowed?: string[]
  requiresOverride?: string[]
  invalid?: string[]
  error?: string
}> {
  try {
    const session = await requireRole(['nurse', 'supervisor', 'admin', 'housekeeping'])

    // Verify user has access to this bed — mirrors the same logic in bed-actions.ts
    const [userWard, bedInfo] = await Promise.all([
      getUserWard(session.userId),
      getBedAccessInfo(bedId)
    ])

    if (!bedInfo) {
      return { success: false, error: 'Bed not found' }
    }

    const hasWardAccess =
      session.role === 'admin' ||
      bedInfo.is_virtual ||
      bedInfo.is_temporary ||
      (!userWard && !bedInfo.ward_id) ||
      (userWard && bedInfo.ward_id && userWard === bedInfo.ward_id)

    if (!hasWardAccess) {
      return { success: false, error: 'Access denied to this bed' }
    }

    const bed = await getBedById(bedId)
    if (!bed) {
      return { success: false, error: 'Bed not found' }
    }

    const allStages = await getAllStages()
    const allStageIds = allStages.map(s => s.id)

    const categorized = await categorizeStagesForTransition(
      bed.currentStageId,
      allStageIds,
      session.role as 'nurse' | 'supervisor' | 'admin' | 'housekeeping'
    )

    logger.info('Valid transitions fetched for bed', {
      bedId,
      role: session.role,
      allowed: categorized.allowed.length,
      requiresOverride: categorized.requiresOverride.length,
      invalid: categorized.invalid.length,
    })

    return {
      success: true,
      allowed: categorized.allowed,
      requiresOverride: categorized.requiresOverride,
      invalid: categorized.invalid,
    }
  } catch (error) {
    logger.error('Failed to get valid transitions for bed', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get valid transitions',
    }
  }
}
