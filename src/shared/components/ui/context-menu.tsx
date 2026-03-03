"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/shared/lib/utils"

export interface ContextMenuItem {
  id: string
  label: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
  onSelect: () => void | Promise<void>
  className?: string
}

export interface ContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number } | null
  items: ContextMenuItem[]
  onClose: () => void
  header?: string
  error?: string | null
}

// FIX for Issue #2 (Off-Screen Menu): Calculate clamped position within viewport
function getClampedPosition(
  x: number,
  y: number,
  menuWidth: number,
  menuHeight: number
): { x: number; y: number } {
  const padding = 8 // Small buffer from edges
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0

  // Clamp X position (prevent horizontal overflow)
  let clampedX = x
  if (x + menuWidth > viewportWidth - padding) {
    clampedX = Math.max(padding, viewportWidth - menuWidth - padding)
  }

  // Clamp Y position (prevent vertical overflow)
  let clampedY = y
  if (y + menuHeight > viewportHeight - padding) {
    clampedY = Math.max(padding, viewportHeight - menuHeight - padding)
  }

  return { x: clampedX, y: clampedY }
}

export function ContextMenu({
  isOpen,
  position,
  items,
  onClose,
  header,
  error,
}: ContextMenuProps) {
  // FIX for Issue #2 (Off-Screen Menu): Estimate menu height and apply clamping
  const clampedPosition = useMemo(() => {
    if (!position) return null
    // Estimate: header (if present) + items with padding
    const headerHeight = header ? 24 : 0
    const itemHeight = items.length * 36 + 16 // approximate height per item + padding
    const estimatedMenuHeight = headerHeight + itemHeight
    const estimatedMenuWidth = 192 // min-w-48 = 12rem = 192px

    return getClampedPosition(
      position.x,
      position.y,
      estimatedMenuWidth,
      estimatedMenuHeight
    )
  }, [position, header, items.length])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  // Detect mobile viewport so the menu renders as a bottom sheet on small screens
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  )
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (!isOpen || !clampedPosition) {
    return null
  }

  // Show error message if transitions couldn't be loaded
  if (error) {
    return (
      <div className="fixed inset-0 z-50" onMouseDown={onClose}>
        <div
          className="absolute min-w-48 rounded-md border border-red-900/50 bg-red-950/95 p-3 shadow-lg backdrop-blur"
          style={{ top: clampedPosition.y, left: clampedPosition.x }}
          onMouseDown={(event) => event.stopPropagation()}
          role="alert"
        >
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={onClose}
            className="mt-2 w-full rounded px-2 py-1 text-xs text-red-200 hover:bg-red-900/30"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn('fixed inset-0 z-50', isMobile && 'flex items-end justify-center')}
      onMouseDown={!isMobile ? onClose : undefined}
      onTouchStart={isMobile ? onClose : undefined}
    >
      <div
        className={cn(
          isMobile
            ? 'w-full rounded-t-2xl border-t border-border bg-card px-4 pb-10 shadow-2xl'
            : 'absolute min-w-48 rounded-md border border-border bg-card p-2 shadow-lg backdrop-blur'
        )}
        style={!isMobile ? { top: clampedPosition.y, left: clampedPosition.x } : undefined}
        onMouseDown={!isMobile ? (event) => event.stopPropagation() : undefined}
        onTouchStart={isMobile ? (event) => event.stopPropagation() : undefined}
        role="menu"
      >
        {isMobile && <div className="mx-auto my-3 h-1.5 w-12 rounded-full bg-zinc-600" />}
        {header && (
          <div className={cn('py-1', isMobile ? 'pb-2 text-sm font-semibold text-card-foreground' : 'px-2 text-xs text-muted-foreground')}>
            {header}
          </div>
        )}
        <div className="space-y-1">
          {items.length === 0 && !error ? (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground animate-pulse">
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
              Loading transitions...
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded text-left text-card-foreground disabled:cursor-not-allowed disabled:opacity-50',
                  isMobile ? 'px-0 py-3 text-base active:bg-muted' : 'px-2 py-1.5 text-sm hover:bg-muted',
                  item.className
                )}
                disabled={item.disabled}
                onClick={(e) => {
                  // FIX for Issue #4 (Double-Click): Check e.detail to allow only single clicks
                  // e.detail > 1 indicates a double-click or higher
                  if (e.detail > 1) {
                    return
                  }

                  if (item.disabled) {
                    return
                  }
                  // onSelect may return a Promise (async stage-update handlers).
                  // We must not let an unhandled rejection escape to the browser.
                  const result = item.onSelect() as unknown
                  if (result instanceof Promise) result.catch(() => {})
                  onClose()
                }}
                role="menuitem"
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
