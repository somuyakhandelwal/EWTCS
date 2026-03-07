// Notification Preference Mutations
// EPIC 15: Notifications & Alerts (US-15.5)
// Purpose: UPSERT and delete notification preference rows.

import 'server-only'

import { query } from '@/shared/lib/db'
import type { NotificationPreferenceItem } from '../schemas/notification-preference-schemas'

/**
 * UPSERT a single preference row for the given user.
 * On conflict (user_id, alert_type) the enabled flag and threshold are updated.
 * created_at is intentionally never updated after the first insert.
 */
export async function upsertNotificationPreference(
  userId: string,
  pref: NotificationPreferenceItem
): Promise<void> {
  await query(
    `INSERT INTO user_notification_preferences
       (user_id, alert_type, enabled, min_delay_threshold_minutes, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, alert_type) DO UPDATE SET
       enabled                     = EXCLUDED.enabled,
       min_delay_threshold_minutes = EXCLUDED.min_delay_threshold_minutes,
       updated_at                  = NOW()`,
    [userId, pref.alertType, pref.enabled, pref.minDelayThresholdMinutes]
  )
}

/**
 * Delete all saved preferences for a user, effectively restoring system defaults.
 */
export async function deleteUserPreferences(userId: string): Promise<void> {
  await query(
    `DELETE FROM user_notification_preferences WHERE user_id = $1`,
    [userId]
  )
}
