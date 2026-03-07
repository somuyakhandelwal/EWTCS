/**
 * HelpDrawer — In-App Contextual Help
 * US-18.4: Provide In-App Help Screens
 *
 * A sliding panel triggered by a "?" button.
 * Accepts `title` and `children` props so each page can supply
 * contextual help content.
 *
 * Usage:
 *   <HelpDrawer title="Dashboard Help">
 *     <p>Use the bed grid to...</p>
 *   </HelpDrawer>
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

export interface HelpDrawerProps {
  title: string
  children: React.ReactNode
}

export function HelpDrawer({ title, children }: HelpDrawerProps) {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, close])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open help"
        aria-expanded={open}
        aria-controls="help-drawer"
        onClick={() => setOpen(true)}
        className="rounded-full text-zinc-400 hover:text-white"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      {/* Backdrop */}
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* Drawer panel */}
      <aside
        id="help-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col',
          'bg-zinc-900 shadow-2xl ring-1 ring-white/10',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-blue-400" aria-hidden="true" />
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close help"
            onClick={close}
            className="rounded-full text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-zinc-300 space-y-3 leading-relaxed">
          {children}
        </div>
      </aside>
    </>
  )
}
