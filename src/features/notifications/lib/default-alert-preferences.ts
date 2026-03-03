import type { AlertPreferences } from '@/features/notifications/types/alert-preferences'

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  enabledAlertTypes: {
    delayedBeds: true,
    escalations: true,
    dispositionBottlenecks: true,
    systemErrors: true,
  },
  thresholds: {
    delayMinutes: 180,
    escalationMinutes: 240,
    bottleneckCount: 3,
  },
}
