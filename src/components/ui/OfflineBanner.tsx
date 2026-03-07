/**
 * Offline Banner
 * US-16.2: Enable Offline UI
 * US-16.1: Cache Data Locally (surface indicator to user)
 *
 * Detects browser network status via navigator.onLine + window events
 * and renders a persistent banner when the network is unavailable.
 */

'use client'

import React, { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Initialise from current state (avoids SSR mismatch — defaults false)
    setIsOffline(!navigator.onLine)

    const handleOffline = () => setIsOffline(true)
    const handleOnline  = () => setIsOffline(false)

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online',  handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online',  handleOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-label="Network unavailable — you are offline"
      className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 bg-red-600 py-2 text-white text-sm font-medium shadow-md print:hidden"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>You are offline. Changes cannot be saved until the connection is restored.</span>
    </div>
  )
}
