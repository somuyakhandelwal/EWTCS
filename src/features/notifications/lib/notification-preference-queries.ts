// Notification Preference Queries
// EPIC 15: Notifications & Alerts (US-15.5)
// Purpose: Read per-user preference rows and merge with system defaults.

import 'server-only'

import { query } from '@/shared/lib/db'
import { DEFAULT_USER_PREFERENCES } from '../types/notification-preferences'
import type { UserPreferenceMap } from '../types/notification-preferences'
import type { AlertType } from '@/features/alerts/types/alert'

interface PreferenceRow {
  alert_type: string
  enabled: boolean
  min_delay_threshold_minutes: number | null
}

/**
 * Fetch a user's saved preferences and merge them with system defaults.
 * Alert types that have no saved row fall back to the default (enabled=true,
 * no threshold override).
 */
export async function getUserPreferenceMap(userId: string): Promise<UserPreferenceMap> {
  const result = await query<PreferenceRow>(
    `SELECT alert_type, enabled, min_delay_threshold_minutes
     FROM   user_notification_preferences
     WHERE  user_id = $1`,
    [userId]
  )

  // Start from a deep copy of the defaults so unset types stay enabled.
  const prefs: UserPreferenceMap = {
    delayed_bed:            { ...DEFAULT_USER_PREFERENCES.delayed_bed },
    disposition_bottleneck: { ...DEFAULT_USER_PREFERENCES.disposition_bottleneck },
    system_error:           { ...DEFAULT_USER_PREFERENCES.system_error },
  }

  for (const row of result.rows) {
    const type = row.alert_type as AlertType
    if (type in prefs) {
      prefs[type] = {
        enabled:                 row.enabled,
        minDelayThresholdMinutes: row.min_delay_threshold_minutes,
      }
    }
  }

  return prefs
}
