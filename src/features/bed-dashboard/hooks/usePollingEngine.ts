// usePollingEngine
// US-1.2: Manages the polling interval and tab-visibility lifecycle.
// Extracted from useRealtimeBedUpdates to keep that hook under 200 lines.

'use client'

import { useRef, useCallback, useEffect, type MutableRefObject } from 'react'
import { realtimeConfig } from '@/shared/config/realtime'

export interface PollingEngineConfig {
  retryTimeoutRef: MutableRefObject<NodeJS.Timeout | null>
  abortControllerRef: MutableRefObject<AbortController | null>
  isOnlineRef: MutableRefObject<boolean>
  /** Called when the browser tab becomes hidden (pauses connection status) */
  onPause?: () => void
  /** Called when the browser tab becomes visible again (resumes status) */
  onResume?: () => void
}

/**
 * Manages the polling interval, tab-visibility pausing, and mount/unmount cleanup.
 *
 * - Starts the interval on mount if `realtimeConfig.enabled && isOnline`.
 * - Pauses when the tab is hidden; fetches immediately on resume.
 * - `stopPolling` clears the interval AND the retry timeout AND aborts in-flight requests.
 *
 * NOTE: `isOnline` is intentionally excluded from the mount/unmount effect's dep array.
 * The parent hook's isOnline effect manages start/stop on network transitions.
 */
export function usePollingEngine(
  fetchData: () => Promise<void>,
  isOnline: boolean,
  config: PollingEngineConfig,
): { startPolling: () => void; stopPolling: () => void } {
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isVisibleRef = useRef(true)
  const { retryTimeoutRef, abortControllerRef, isOnlineRef, onPause, onResume } = config

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [retryTimeoutRef, abortControllerRef])

  const startPolling = useCallback(() => {
    if (!realtimeConfig.enabled || pollIntervalRef.current) return
    pollIntervalRef.current = setInterval(() => {
      if (isVisibleRef.current && isOnlineRef.current) void fetchData()
    }, realtimeConfig.pollingInterval)
  }, [fetchData, isOnlineRef])

  // Pause polling when tab is hidden; resume and fetch immediately when visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden
      if (document.hidden) {
        onPause?.()
      } else {
        onResume?.()
        if (isOnlineRef.current) void fetchData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchData, isOnlineRef, onPause, onResume])

  // Start on mount; clean up on unmount
  useEffect(() => {
    if (realtimeConfig.enabled && isOnline) startPolling()
    return () => stopPolling()
    // isOnline excluded: the parent hook's isOnline effect manages network transitions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPolling, stopPolling])

  return { startPolling, stopPolling }
}
