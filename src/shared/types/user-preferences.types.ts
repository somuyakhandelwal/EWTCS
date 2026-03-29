// Shared type for user preference persistence (DB5-02)
// Stored in user_settings.preferences JSONB column

export type SortOrder = 'none' | 'desc'

export interface UserPreferences {
  /** Whether to show a confirmation dialog before advancing critical stages */
  confirmCriticalStages: boolean
  /** Whether the bed grid "show delayed only" filter is active */
  showDelayedOnly: boolean
  /** Sort order for the bed grid (by elapsed time descending) */
  sortOrder: SortOrder
  /** Whether the help panel is currently open */
  helpPanelOpen: boolean
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  confirmCriticalStages: true,
  showDelayedOnly: false,
  sortOrder: 'none',
  helpPanelOpen: false,
}
