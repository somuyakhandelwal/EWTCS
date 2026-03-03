'use client'

import { useCallback, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getHelpContextByPath } from '@/features/help/lib/help-content'

const HELP_PANEL_STORAGE_KEY = 'ewtcs_help_panel_open'

function persist(value: boolean): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(HELP_PANEL_STORAGE_KEY, value ? '1' : '0')
  }
}

function readInitialOpenState(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(HELP_PANEL_STORAGE_KEY) === '1'
}

export function useHelpState() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState<boolean>(readInitialOpenState)

  const context = useMemo(() => getHelpContextByPath(pathname), [pathname])

  const openHelp = useCallback(() => { setIsOpen(true); persist(true) }, [])
  const closeHelp = useCallback(() => { setIsOpen(false); persist(false) }, [])
  const toggleHelp = useCallback(() => {
    setIsOpen((prev) => { persist(!prev); return !prev })
  }, [])

  return { pathname, context, isOpen, openHelp, closeHelp, toggleHelp }
}
