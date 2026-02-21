'use server'
// US-6.3: System Settings Server Actions — admin-only global threshold management

import { query } from '@/shared/lib/db'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import { z } from 'zod'
import { getGlobalThresholdMinutes } from '@/shared/lib/threshold'
import { SETTINGS_CACHE_TAG } from '@/shared/lib/query-cache'

const SetThresholdSchema = z.object({
  hours: z.coerce.number().int().min(0).max(24),
  minutes: z.coerce.number().int().min(0).max(59),
}).refine(({ hours, minutes }) => hours * 60 + minutes >= 30, {
  message: 'Threshold must be at least 30 minutes',
})

export async function getGlobalThresholdAction(): Promise<{
  success: boolean
  minutes?: number
  error?: string
}> {
  try {
    const minutes = await getGlobalThresholdMinutes()
    return { success: true, minutes }
  } catch (err) {
    logger.error('getGlobalThresholdAction failed', err as Error)
    return { success: false, error: 'Failed to load threshold' }
  }
}

export async function setGlobalThresholdAction(input: {
  hours: number
  minutes: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(['admin'])
    const parsed = SetThresholdSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
      return { success: false, error: firstError ?? 'Validation error' }
    }
    const totalMinutes = parsed.data.hours * 60 + parsed.data.minutes
    await query(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ('delay_threshold_minutes', $1, NOW())
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = NOW()`,
      [String(totalMinutes)]
    )
    await logAudit({
      actionType: 'UPDATE',
      entityType: 'system_setting',
      entityId: 'delay_threshold_minutes',
      performedBy: session.userId,
      changes: { delay_threshold_minutes: totalMinutes },
    })
    logger.info('Global threshold updated', { totalMinutes, performedBy: session.userId })
    // EPIC 13: Invalidate the settings cache so the next dashboard request
    // fetches the new threshold from the DB instead of serving a stale cached value.
    revalidateTag(SETTINGS_CACHE_TAG)
    revalidatePath('/admin/stages')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update threshold'
    logger.error('setGlobalThresholdAction failed', err as Error)
    return { success: false, error: message }
  }
}

export async function setStageThresholdAction(input: {
  stageId: string
  hours: number
  minutes: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(['admin'])
    const parsed = SetThresholdSchema.safeParse({ hours: input.hours, minutes: input.minutes })
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
      return { success: false, error: firstError ?? 'Validation error' }
    }
    const totalMinutes = parsed.data.hours * 60 + parsed.data.minutes
    await query(
      `INSERT INTO stage_delay_thresholds (stage_id, threshold_minutes, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (stage_id) DO UPDATE
         SET threshold_minutes = EXCLUDED.threshold_minutes, updated_at = NOW()`,
      [input.stageId, totalMinutes]
    )
    await logAudit({
      actionType: 'UPDATE',
      entityType: 'stage_threshold',
      entityId: input.stageId,
      performedBy: session.userId,
      changes: { threshold_minutes: totalMinutes },
    })
    logger.info('Stage threshold updated', { stageId: input.stageId, totalMinutes })
    revalidatePath('/admin/stages')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    logger.error('setStageThresholdAction failed', err as Error)
    return { success: false, error: 'Failed to update stage threshold' }
  }
}

export async function clearStageThresholdAction(
  stageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(['admin'])
    await query(
      `DELETE FROM stage_delay_thresholds WHERE stage_id = $1`,
      [stageId]
    )
    await logAudit({
      actionType: 'DELETE',
      entityType: 'stage_threshold',
      entityId: stageId,
      performedBy: session.userId,
      changes: {},
    })
    logger.info('Stage threshold cleared', { stageId, performedBy: session.userId })
    revalidatePath('/admin/stages')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    logger.error('clearStageThresholdAction failed', err as Error)
    return { success: false, error: 'Failed to clear stage threshold' }
  }
}
