// Re-exports shared AlertPreferences types — keeps the original import path working
// and avoids cross-feature imports into bed-dashboard.
export type {
  AlertTypeKey,
  AlertTypePreferences,
  AlertThresholdPreferences,
  AlertPreferences,
} from '@/shared/types/alert-preferences.types'
