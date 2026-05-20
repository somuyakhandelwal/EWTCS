// Real-time Bed Updates Hook
// US-1.2: Display Real-Time Bed Status
// US-16.1: Cache Data Locally
// US-16.2: Enable Offline UI

'use client'

import { useCallback, useEffect, useRef } from 'react'
import { handleOnlineStatus, pauseConnectionStatus, resumeConnectionStatus } from '../lib/connection-manager'
import { useNetworkStatus } from './useNetworkStatus'
import { useFetchBedData } from './useFetchBedData'
import { usePollingEngine } from './usePollingEngine'
import type { BedGridData } from '../types/bed'
import type { UseRealtimeBedUpdatesReturn } from '../types/realtime'
import type { BedAreaView } from '../actions/bed-grid-actions'

/**
 * Composes useFetchBedData + usePollingEngine + useNetworkStatus to deliver
 * real-time bed updates with offline cache fallback (US-16.1 / US-16.2).
 */
export function useRealtimeBedUpdates(
  initialData: BedGridData,
  areaView: BedAreaView = 'all',
): UseRealtimeBedUpdatesReturn<BedGridData> {
  const { isOnline } = useNetworkStatus()
  const isOnlineRef = useRef(isOnline)

  const {
    data,
    isLoading,
    connectionStatus,
    setConnectionStatus,
    cacheTimestamp,
    fetchData,
    abortControllerRef,
    retryTimeoutRef,
    errorCountRef,
  } = useFetchBedData(initialData, isOnlineRef, areaView)

  const { startPolling, stopPolling } = usePollingEngine(fetchData, isOnline, {
    retryTimeoutRef,
    abortControllerRef,
    isOnlineRef,
    onPause: () => setConnectionStatus(pauseConnectionStatus),
    onResume: () => setConnectionStatus(resumeConnectionStatus),
  })

  // React to online ↔ offline transitions
  useEffect(() => {
    isOnlineRef.current = isOnline

    if (!isOnline) {
      stopPolling()
      // fetchData detects isOnlineRef.current=false and loads cache + updates status
      void fetchData()
    } else {
      setConnectionStatus((prev) => handleOnlineStatus(prev))
      stopPolling()
      void fetchData()
      startPolling()
    }
  }, [isOnline, fetchData, startPolling, stopPolling, setConnectionStatus])

  // Manual reconnect — resets error state and re-starts the poll cycle
  const reconnect = useCallback(() => {
    errorCountRef.current = 0
    setConnectionStatus({
      status: 'reconnecting',
      lastUpdate: connectionStatus.lastUpdate,
      errorCount: 0,
    })
    stopPolling()
    void fetchData()
    startPolling()
  }, [connectionStatus.lastUpdate, errorCountRef, fetchData, startPolling, stopPolling, setConnectionStatus])

  return {
    data,
    connectionStatus,
    isLoading,
    refresh: fetchData,
    reconnect,
    isOffline: !isOnline,
    cacheTimestamp,
  }
}

// Re-export sub-hooks so consumers can import from a single entry-point if needed
export { useFetchBedData } from './useFetchBedData'
export { usePollingEngine } from './usePollingEngine'

