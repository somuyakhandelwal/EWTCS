// Notification Preference Types
// EPIC 15: Notifications & Alerts (US-15.5)

import type { AlertType } from '@/features/alerts/types/alert'

export type { AlertType }

/** A single row from user_notification_preferences */
export interface NotificationPreference {
  id: string
  userId: string
  alertType: AlertType
  enabled: boolean
  /** Override threshold in minutes. null = use the system default. */
  minDelayThresholdMinutes: number | null
  createdAt: Date
  updatedAt: Date
}

/** Convenience map keyed by AlertType, merged with defaults for missing rows. */
export type UserPreferenceMap = Record<
  AlertType,
  { enabled: boolean; minDelayThresholdMinutes: number | null }
>

/** Used in the UI to describe each alert type to the user. */
export const ALERT_TYPE_DESCRIPTIONS: Record<AlertType, { label: string; description: string }> = {
  delayed_bed: {
    label: 'Delayed Bed',
    description: 'Alert when a bed has been occupied for longer than the delay threshold.',
  },
  disposition_bottleneck: {
    label: 'Disposition Bottleneck',
    description: 'Alert when a bed is stuck waiting for a disposition decision.',
  },
  system_error: {
    label: 'System Error',
    description: 'Alert when an ERROR or CRITICAL system event is logged.',
  },
}

/** System defaults: all types on, no threshold overrides. */
export const DEFAULT_USER_PREFERENCES: UserPreferenceMap = {
  delayed_bed:             { enabled: true, minDelayThresholdMinutes: null },
  disposition_bottleneck:  { enabled: true, minDelayThresholdMinutes: null },
  system_error:            { enabled: true, minDelayThresholdMinutes: null },
}

export const ALERT_TYPES: AlertType[] = ['delayed_bed', 'disposition_bottleneck', 'system_error']
