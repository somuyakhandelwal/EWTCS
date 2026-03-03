import { query } from '@/shared/lib/db'
import type { AlertPreferences } from '@/features/notifications/types/alert-preferences'
import { DEFAULT_ALERT_PREFERENCES } from './default-alert-preferences'
import { alertPreferencesSchema } from '@/features/notifications/schemas/alert-preferences-schema'

interface AlertPreferenceRow {
  enabled_alert_types: Record<string, unknown>
  threshold_overrides: Record<string, unknown>
}

export async function readAlertPreferences(userId: string): Promise<AlertPreferences | null> {
  const result = await query<AlertPreferenceRow>(
    `SELECT enabled_alert_types, threshold_overrides
     FROM alert_preferences
     WHERE user_id = $1`,
    [userId]
  )

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  const enabledAlertTypes = {
    ...DEFAULT_ALERT_PREFERENCES.enabledAlertTypes,
    ...(row.enabled_alert_types ?? {}),
  }
  const thresholds = {
    ...DEFAULT_ALERT_PREFERENCES.thresholds,
    ...(row.threshold_overrides ?? {}),
  }

  const parsed = alertPreferencesSchema.safeParse({
    enabledAlertTypes,
    thresholds,
  })

  if (!parsed.success) {
    return null
  }

  return parsed.data
}

export async function upsertAlertPreferences(userId: string, preferences: AlertPreferences): Promise<void> {
  await query(
    `INSERT INTO alert_preferences (user_id, enabled_alert_types, threshold_overrides, updated_at)
     VALUES ($1, $2::jsonb, $3::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       enabled_alert_types = EXCLUDED.enabled_alert_types,
       threshold_overrides = EXCLUDED.threshold_overrides,
       updated_at = NOW()`,
    [userId, JSON.stringify(preferences.enabledAlertTypes), JSON.stringify(preferences.thresholds)]
  )
}

export async function resetAlertPreferences(userId: string): Promise<void> {
  await upsertAlertPreferences(userId, DEFAULT_ALERT_PREFERENCES)
}
