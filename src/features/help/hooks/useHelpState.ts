'use client'
// DB5-02: Migrated from localStorage ('ewtcs_help_panel_open') → DB via server action.
// Cannot SSR because GlobalHelp lives in the root layout (no session context there).
// Strategy: initialize closed (false), load DB value async on mount.
// Since default is closed, there is no visible flash — the panel simply opens if DB says so.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getHelpContextByPath } from '@/features/help/lib/help-content'
import {
  getUserSettings,
  updateUserSettings,
} from '@/features/bed-dashboard/actions/user-settings-actions'

export function useHelpState() {
  const pathname = usePathname()
  // Start closed (default). DB value applied async on mount — no visible flash.
  const [isOpen, setIsOpen] = useState<boolean>(false)
  // Track whether DB prefs have been loaded — used to suppress telemetry before load
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  const context = useMemo(() => getHelpContextByPath(pathname), [pathname])

  // Load persisted open state from DB on first mount
  useEffect(() => {
    let cancelled = false
    getUserSettings()
      .then(prefs => {
        if (!cancelled) {
          setIsOpen(prefs.helpPanelOpen)
          setPrefsLoaded(true)
        }
      })
      .catch(() => {
        // Graceful failure — user is not logged in or DB is unavailable
        if (!cancelled) setPrefsLoaded(true)
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount only

  // Persist help panel state to DB — discrete action, no debounce needed
  const persistToDb = useCallback((value: boolean) => {
    void updateUserSettings({ helpPanelOpen: value })
  }, [])

  const openHelp = useCallback(() => {
    setIsOpen(true)
    persistToDb(true)
  }, [persistToDb])

  const closeHelp = useCallback(() => {
    setIsOpen(false)
    persistToDb(false)
  }, [persistToDb])

  const toggleHelp = useCallback(() => {
    setIsOpen(prev => {
      persistToDb(!prev)
      return !prev
    })
  }, [persistToDb])

  return { pathname, context, isOpen, prefsLoaded, openHelp, closeHelp, toggleHelp }
}
