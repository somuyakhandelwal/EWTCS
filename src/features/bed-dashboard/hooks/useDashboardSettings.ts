'use client'
// DB5-02: Migrated from localStorage ('ewtcs-dashboard-settings') → DB via server action.
// Initial value comes from SSR (BedDashboardContainer fetches preferences server-side).
// On change: debounced 300ms write to user_settings via updateUserSettings.

import { useState, useCallback, useRef, useEffect } from 'react'
import { updateUserSettings } from '@/features/bed-dashboard/actions/user-settings-actions'

const DEBOUNCE_MS = 300

interface DashboardSettings {
  confirmCriticalStages: boolean
}

/**
 * @param initialConfirmCriticalStages - Server-fetched initial value (SSR, no flash).
 *   Defaults to true for contexts where SSR initial value is unavailable.
 */
export function useDashboardSettings(initialConfirmCriticalStages: boolean = true) {
  const [settings, setSettings] = useState<DashboardSettings>({
    confirmCriticalStages: initialConfirmCriticalStages,
  })

  // Keep state in sync if the parent re-renders with a new initial value
  // (edge case: different user logs in without full page reload)
  useEffect(() => {
    setSettings({ confirmCriticalStages: initialConfirmCriticalStages })
  }, [initialConfirmCriticalStages])

  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const persistToDb = useCallback((patch: Partial<DashboardSettings>) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      void updateUserSettings(patch)
    }, DEBOUNCE_MS)
  }, [])

  const updateSettings = useCallback((newSettings: Partial<DashboardSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...newSettings }
      persistToDb(next)
      return next
    })
  }, [persistToDb])

  const toggleConfirmation = useCallback(() => {
    setSettings(prev => {
      const next = { ...prev, confirmCriticalStages: !prev.confirmCriticalStages }
      persistToDb(next)
      return next
    })
  }, [persistToDb])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  return {
    settings,
    updateSettings,
    toggleConfirmation,
  }
}
