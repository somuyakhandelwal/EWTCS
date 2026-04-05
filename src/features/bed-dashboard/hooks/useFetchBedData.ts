// useFetchBedData
// US-1.2: Real-time data fetch with error handling, cache fallback, and retry.
// Extracted from useRealtimeBedUpdates to keep that hook under 200 lines.

'use client'

import { useState, useCallback, useRef, type MutableRefObject } from 'react'
import { getBedGridData } from '../actions/bed-grid-actions'
import { getStableBeds } from '../lib/bed-diff'
import { realtimeConfig } from '@/shared/config/realtime'
import {
  getRetryInterval,
  handleConnectionError,
  resetConnectionStatus,
  handleOfflineStatus,
} from '../lib/connection-manager'
import { fetchServerSnapshot, saveToCache, loadFromCache } from '../lib/offline-cache'
import type { BedGridData } from '../types/bed'
import type { ConnectionStatusDetails } from '../types/realtime'

export interface FetchBedDataReturn {
  data: BedGridData
  isLoading: boolean
  connectionStatus: ConnectionStatusDetails
  /** Exposed so the parent hook can set 'reconnecting' / online-restored status */
  setConnectionStatus: React.Dispatch<React.SetStateAction<ConnectionStatusDetails>>
  cacheTimestamp: number | null
  fetchData: () => Promise<void>
  abortControllerRef: MutableRefObject<AbortController | null>
  retryTimeoutRef: MutableRefObject<NodeJS.Timeout | null>
  /** Mutable counter reset to 0 on successful fetch */
  errorCountRef: MutableRefObject<number>
}

/**
 * Manages the fetch-data state: bed grid data, loading/error status,
 * cache timestamp, and the async fetchData callback.
 *
 * `isOnlineRef` is read at call time so the callback can detect
 * offline state without stale-closure issues.
 */
export function useFetchBedData(
  initialData: BedGridData,
  isOnlineRef: MutableRefObject<boolean>,
): FetchBedDataReturn {
  const [data, setData] = useState<BedGridData>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusDetails>({
    status: 'connected',
    lastUpdate: new Date(),
    errorCount: 0,
  })
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const errorCountRef = useRef(0)
  // Stable self-reference so the retry timeout can call the latest fetchData
  const fetchDataRef = useRef<(() => Promise<void>) | undefined>(undefined)

  const fetchData = useCallback(async () => {
    if (!realtimeConfig.enabled) return

    // Offline: skip network, load from cache instead
    if (!isOnlineRef.current) {
      const cached = loadFromCache()
      if (cached) {
        setData((prev) => ({ ...cached.data, beds: getStableBeds(prev.beds, cached.data.beds) }))
        setCacheTimestamp(cached.timestamp)
        setConnectionStatus((prev) => handleOfflineStatus(prev, new Date(cached.timestamp)))
      } else {
        setConnectionStatus((prev) => handleOfflineStatus(prev, null))
      }
      return
    }

    if (abortControllerRef.current) abortControllerRef.current.abort()
    abortControllerRef.current = new AbortController()
    setIsLoading(true)

    try {
      const result = await getBedGridData()
      if (result.success && result.data) {
        setData((prev) => ({
          ...result.data!,
          beds: getStableBeds(prev.beds, result.data!.beds),
        }))
        saveToCache(result.data)     // US-16.1: persist for offline fallback
        setCacheTimestamp(null)      // displaying live data
        errorCountRef.current = 0
        setConnectionStatus(resetConnectionStatus())
      } else {
        throw new Error(result.error || 'Failed to fetch bed data')
      }
    } catch (error) {
      // Guard: browser abort event objects and non-Error values (e.g. Next.js RSC cancel)
      if (error instanceof Event) return
      if (error instanceof Error && error.name === 'AbortError') return
      const msg = error instanceof Error ? error.message : 'Unknown error'
      errorCountRef.current += 1
      setConnectionStatus((prev) => handleConnectionError(prev, msg))
      const cached = loadFromCache()
      if (cached) {
        setData((prev) => ({ ...cached.data, beds: getStableBeds(prev.beds, cached.data.beds) }))
        setCacheTimestamp(cached.timestamp)
      } else {
        const snapshot = await fetchServerSnapshot()
        if (snapshot) {
          setData((prev) => ({ ...snapshot.data, beds: getStableBeds(prev.beds, snapshot.data.beds) }))
          setCacheTimestamp(snapshot.timestamp)
          saveToCache(snapshot.data)
        }
      }
      // Exponential backoff retry — catch the returned Promise so it cannot become an
      // unhandled rejection if fetchData rejects again on the retry.
      retryTimeoutRef.current = setTimeout(
        () => { fetchDataRef.current?.().catch(() => {}) },
        getRetryInterval(errorCountRef.current),
      )
    } finally {
      setIsLoading(false)
    }
  // All deps (state setters, ref objects) are stable — empty array is intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  fetchDataRef.current = fetchData

  return {
    data,
    isLoading,
    connectionStatus,
    setConnectionStatus,
    cacheTimestamp,
    fetchData,
    abortControllerRef,
    retryTimeoutRef,
    errorCountRef,
  }
}
