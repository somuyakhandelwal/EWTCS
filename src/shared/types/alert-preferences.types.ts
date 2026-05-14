// Alert Preferences Types — Shared
// Used by: notifications, bed-dashboard (SupervisorBedOverview)
// Shared to avoid cross-feature imports.

export type AlertTypeKey =
  | 'delayedBeds'
  | 'escalations'
  | 'dispositionBottlenecks'
  | 'systemErrors'

export interface AlertTypePreferences {
  delayedBeds: boolean
  escalations: boolean
  dispositionBottlenecks: boolean
  systemErrors: boolean
}

export interface AlertThresholdPreferences {
  delayMinutes: number
  escalationMinutes: number
  bottleneckCount: number
}

export interface AlertPreferences {
  enabledAlertTypes: AlertTypePreferences
  thresholds: AlertThresholdPreferences
}
