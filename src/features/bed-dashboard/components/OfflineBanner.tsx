// Offline Banner Component
// US-16.2: Enable Offline UI
// Renders a prominent banner when the browser has no network connection.
// Shows pending queued write count, sync status, and last cache age.

'use client'

import React from 'react'
import { WifiOff, RefreshCw, Clock } from 'lucide-react'

interface OfflineBannerProps {
  /** Whether the browser is currently offline */
  isOffline: boolean
  /** Number of write operations waiting to be synced */
  pendingCount?: number
  /** Whether a sync drain is currently in progress */
  isDraining?: boolean
  /** Epoch ms timestamp of the current cache snapshot (null = no cache) */
  cacheTimestamp?: number | null
}

function formatCacheAge(timestamp: number): string {
  const ageMs = Date.now() - timestamp
  const ageSec = Math.floor(ageMs / 1000)

  if (ageSec < 60) return `${ageSec}s ago`
  if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m ago`
  return `${Math.floor(ageSec / 3600)}h ago`
}

/**
 * Amber banner shown at the top of the bed dashboard when the browser is offline.
 * - States: "You're offline — showing cached data" | "Syncing N updates…"
 * - Shows pending operation count and cache age.
 * - Hidden when online (renders nothing).
 */
export const OfflineBanner = React.memo(function OfflineBanner({
  isOffline,
  pendingCount = 0,
  isDraining = false,
  cacheTimestamp = null,
}: OfflineBannerProps) {
  if (!isOffline) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400"
    >
      {/* Icon */}
      {isDraining ? (
        <RefreshCw
          className="h-4 w-4 shrink-0 animate-spin"
          aria-hidden="true"
        />
      ) : (
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}

      {/* Primary message */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold">
          {isDraining
            ? `Syncing ${pendingCount} update${pendingCount !== 1 ? 's' : ''}…`
            : "You're offline — showing cached data"}
        </span>

        {/* Sub-message: cache age + pending count */}
        {!isDraining && (
          <span className="ml-2 text-xs font-normal opacity-80">
            {cacheTimestamp !== null && (
              <>
                <Clock className="inline h-3 w-3 mr-0.5 -mt-0.5" aria-hidden="true" />
                {formatCacheAge(cacheTimestamp)}
              </>
            )}
            {pendingCount > 0 && (
              <span className="ml-2">
                •{' '}
                <strong>{pendingCount}</strong>{' '}
                update{pendingCount !== 1 ? 's' : ''} pending sync
              </span>
            )}
          </span>
        )}
      </div>

      {/* Right label */}
      <span className="shrink-0 text-xs font-medium opacity-70 hidden sm:block">
        {isDraining ? 'Please wait…' : 'Read-only mode'}
      </span>
    </div>
  )
})
