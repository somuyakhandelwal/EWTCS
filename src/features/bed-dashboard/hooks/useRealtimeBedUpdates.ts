// Real-time Bed Updates Hook
// Epic 1: Nurse Desk Bed Dashboard
// US-1.2: Display Real-Time Bed Status

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getBedGridData } from '../actions/bed-actions'
import { getStableBeds } from '../lib/bed-diff'
import { realtimeConfig } from '@/shared/config/realtime'
import {
  getRetryInterval,
  handleConnectionError,
  resetConnectionStatus,
  pauseConnectionStatus,
  resumeConnectionStatus,
} from '../lib/connection-manager'
import type { BedGridData } from '../types/bed'
import type { 
  UseRealtimeBedUpdatesReturn, 
  ConnectionStatusDetails 
} from '../types/realtime'

/**
 * Custom hook for real-time bed status updates
 * Implements intelligent polling with error handling and connection status tracking
 */
export function useRealtimeBedUpdates(
  initialData: BedGridData
): UseRealtimeBedUpdatesReturn<BedGridData> {
  const [data, setData] = useState<BedGridData>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusDetails>({
    status: 'connected',
    lastUpdate: new Date(),
    errorCount: 0,
  })

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isVisibleRef = useRef(true)
  const errorCountRef = useRef(0)

  /**
   * Fetch latest bed data from server
   */
  const fetchData = useCallback(async () => {
    if (!realtimeConfig.enabled) return

    try {
      // Cancel previous request if still in flight
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      setIsLoading(true)

      const result = await getBedGridData()

      if (result.success && result.data) {
        // Use smart diffing to prevent unnecessary updates
        setData((prevData) => ({
          ...result.data!,
          beds: getStableBeds(prevData.beds, result.data!.beds),
        }))

        errorCountRef.current = 0
        setConnectionStatus(resetConnectionStatus())
      } else {
        throw new Error(result.error || 'Failed to fetch bed data')
      }
    } catch (error) {
      // Ignore abort errors (user-initiated cancellation)
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      errorCountRef.current += 1
      setConnectionStatus((prev) => handleConnectionError(prev, errorMessage))

      // Schedule retry with exponential backoff
      const retryInterval = getRetryInterval(errorCountRef.current)
      retryTimeoutRef.current = setTimeout(() => {
        fetchData()
      }, retryInterval)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    if (!realtimeConfig.enabled) return
    if (pollIntervalRef.current) return // Already polling

    pollIntervalRef.current = setInterval(() => {
      if (isVisibleRef.current) {
        fetchData()
      }
    }, realtimeConfig.pollingInterval)
  }, [fetchData])

  /**
   * Stop polling
   */
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
  }, [])

  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  /**
   * Manual reconnect
   */
  const reconnect = useCallback(() => {
    errorCountRef.current = 0
    setConnectionStatus({
      status: 'reconnecting',
      lastUpdate: connectionStatus.lastUpdate,
      errorCount: 0,
    })
    stopPolling()
    fetchData()
    startPolling()
  }, [connectionStatus.lastUpdate, fetchData, startPolling, stopPolling])

  /**
   * Handle visibility change (pause polling when tab inactive)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden

      if (document.hidden) {
        setConnectionStatus(pauseConnectionStatus)
      } else {
        // Resume and fetch immediately
        setConnectionStatus(resumeConnectionStatus)
        fetchData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchData])

  /**
   * Start/stop polling on mount/unmount
   */
  useEffect(() => {
    if (realtimeConfig.enabled) {
      startPolling()
    }

    return () => {
      stopPolling()
    }
  }, [startPolling, stopPolling])

  return {
    data,
    connectionStatus,
    isLoading,
    refresh,
    reconnect,
  }
}
