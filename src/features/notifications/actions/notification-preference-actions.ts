// Notification Preference Server Actions
// EPIC 15: Notifications & Alerts (US-15.5)
// Purpose: Read, update, and reset a user's notification preferences.

'use server'

import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import { getUserPreferenceMap } from '../lib/notification-preference-queries'
import {
  upsertNotificationPreference,
  deleteUserPreferences,
} from '../lib/notification-preference-mutations'
import { updateNotificationPreferencesSchema } from '../schemas/notification-preference-schemas'
import type { UpdateNotificationPreferencesInput } from '../schemas/notification-preference-schemas'
import type { UserPreferenceMap } from '../types/notification-preferences'

/** Fetch the current user's preference map (merged with defaults). */
export async function getNotificationPreferencesAction(): Promise<{
  success: boolean
  preferences?: UserPreferenceMap
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin'])
    const preferences = await getUserPreferenceMap(session.userId)
    return { success: true, preferences }
  } catch (error) {
    logger.error('Failed to fetch notification preferences', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch preferences',
    }
  }
}

/** UPSERT all supplied preferences for the current user. */
export async function updateNotificationPreferencesAction(
  rawInput: UpdateNotificationPreferencesInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(['supervisor', 'admin'])

    const parsed = updateNotificationPreferencesSchema.safeParse(rawInput)
    if (!parsed.success) {
      const firstError =
        Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? 'Invalid input'
      return { success: false, error: firstError }
    }

    await Promise.all(
      parsed.data.preferences.map((pref) =>
        upsertNotificationPreference(session.userId, pref)
      )
    )

    await logAudit({
      actionType: 'UPDATE',
      entityType: 'notification_preferences',
      entityId:   session.userId,
      performedBy: session.userId,
      changes:    { preferences: parsed.data.preferences },
    })

    logger.info('Notification preferences updated', {
      userId: session.userId,
      count:  parsed.data.preferences.length,
    })

    return { success: true }
  } catch (error) {
    logger.error('Failed to update notification preferences', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update preferences',
    }
  }
}

/** Delete all saved preferences, restoring system defaults for the current user. */
export async function resetNotificationPreferencesAction(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin'])

    await deleteUserPreferences(session.userId)

    await logAudit({
      actionType:  'DELETE',
      entityType:  'notification_preferences',
      entityId:    session.userId,
      performedBy: session.userId,
      changes:     { action: 'reset_to_defaults' },
    })

    logger.info('Notification preferences reset to defaults', { userId: session.userId })
    return { success: true }
  } catch (error) {
    logger.error('Failed to reset notification preferences', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset preferences',
    }
  }
}
