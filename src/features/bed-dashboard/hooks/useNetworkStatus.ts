// useNetworkStatus
// US-16.2: Enable Offline UI
// Reactively tracks browser online/offline state via the Window online/offline events.
// SSR-safe: defaults to `true` (online) when `window` is not available.

'use client'

import { useState, useEffect } from 'react'

export interface NetworkStatus {
  /** True when the browser reports network connectivity */
  isOnline: boolean
}

/**
 * Subscribes to the browser `online` and `offline` events.
 * On mount it reads `navigator.onLine` for the accurate initial value.
 *
 * Usage:
 * ```ts
 * const { isOnline } = useNetworkStatus()
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  // Start as `true` on both server and client so the first hydration pass always
  // matches the server HTML. The effect immediately corrects to `navigator.onLine`
  // after hydration — this is the only safe pattern when the device may already be
  // offline at page-load time, otherwise the SSR/client states differ and React
  // throws a hydration mismatch.
  const [isOnline, setIsOnline] = useState<boolean>(true)

  useEffect(() => {
    // Correct to the real value after hydration
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}
