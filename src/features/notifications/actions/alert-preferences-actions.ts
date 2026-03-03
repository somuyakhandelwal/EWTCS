'use server'

import { z } from 'zod'
import { logger } from '@/shared/config/logger'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { alertPreferencesSchema } from '@/features/notifications/schemas/alert-preferences-schema'
import { DEFAULT_ALERT_PREFERENCES } from '@/features/notifications/lib/default-alert-preferences'
import {
  readAlertPreferences,
  resetAlertPreferences,
  upsertAlertPreferences,
} from '@/features/notifications/lib/alert-preferences-queries'
import type { AlertPreferences } from '@/features/notifications/types/alert-preferences'

const updatePayloadSchema = z.object({
  preferences: alertPreferencesSchema,
})

function getValidationErrorMessage(error: z.ZodError): string {
  const flattened = error.flatten()
  const firstFieldError = Object.values(flattened.fieldErrors).find(
    (messages): messages is string[] => Array.isArray(messages) && messages.length > 0
  )
  return firstFieldError?.[0] ?? flattened.formErrors[0] ?? 'Validation error'
}

function toAuditChanges(preferences: AlertPreferences): Record<string, unknown> {
  return {
    enabledAlertTypes: { ...preferences.enabledAlertTypes },
    thresholds: { ...preferences.thresholds },
  }
}

export async function getMyAlertPreferences(): Promise<{
  success: boolean
  data?: AlertPreferences
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin'])
    const existing = await readAlertPreferences(session.userId)

    if (existing) {
      return { success: true, data: existing }
    }

    await upsertAlertPreferences(session.userId, DEFAULT_ALERT_PREFERENCES)
    return { success: true, data: DEFAULT_ALERT_PREFERENCES }
  } catch (error) {
    logger.error('getMyAlertPreferences failed', error as Error)
    return { success: false, error: 'Failed to load alert preferences' }
  }
}

export async function updateMyAlertPreferences(input: {
  preferences: AlertPreferences
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(['supervisor', 'admin'])
    const parsed = updatePayloadSchema.safeParse(input)

    if (!parsed.success) {
      return { success: false, error: getValidationErrorMessage(parsed.error) }
    }

    await upsertAlertPreferences(session.userId, parsed.data.preferences)

    await logAudit({
      actionType: 'ALERT_PREFERENCES_UPDATE',
      entityType: 'alert_preferences',
      entityId: session.userId,
      performedBy: session.userId,
      changes: toAuditChanges(parsed.data.preferences),
      reason: 'Supervisor updated personal alert preferences',
    })

    return { success: true }
  } catch (error) {
    logger.error('updateMyAlertPreferences failed', error as Error)
    return { success: false, error: 'Failed to save alert preferences' }
  }
}

export async function resetMyAlertPreferences(): Promise<{
  success: boolean
  data?: AlertPreferences
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin'])

    await resetAlertPreferences(session.userId)

    await logAudit({
      actionType: 'ALERT_PREFERENCES_RESET',
      entityType: 'alert_preferences',
      entityId: session.userId,
      performedBy: session.userId,
      changes: toAuditChanges(DEFAULT_ALERT_PREFERENCES),
      reason: 'Supervisor reset personal alert preferences to defaults',
    })

    return { success: true, data: DEFAULT_ALERT_PREFERENCES }
  } catch (error) {
    logger.error('resetMyAlertPreferences failed', error as Error)
    return { success: false, error: 'Failed to reset alert preferences' }
  }
}
