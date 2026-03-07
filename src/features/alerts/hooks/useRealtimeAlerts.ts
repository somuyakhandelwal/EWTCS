// Real-time Alerts Hook
// EPIC 15: Notifications & Alerts (US-15.4)
// Purpose: Polls getAlertsAction on a 3-second interval with exponential
//   backoff on errors and visibility-aware pausing.

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getAlertsAction } from '../actions/alert-actions'
import { realtimeConfig } from '@/shared/config/realtime'
import {
  getRetryInterval,
  handleConnectionError,
  resetConnectionStatus,
  pauseConnectionStatus,
  resumeConnectionStatus,
} from '@/features/bed-dashboard/lib/connection-manager'
import type { Alert } from '../types/alert'
import type { ConnectionStatusDetails } from '@/features/bed-dashboard/types/realtime'

export interface UseRealtimeAlertsReturn {
  alerts: Alert[]
  connectionStatus: ConnectionStatusDetails
  isLoading: boolean
  refresh: () => Promise<void>
  reconnect: () => void
}

export function useRealtimeAlerts(initialAlerts: Alert[]): UseRealtimeAlertsReturn {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusDetails>({
    status: 'connected',
    lastUpdate: new Date(),
    errorCount: 0,
  })

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isVisibleRef = useRef(true)
  const errorCountRef = useRef(0)

  const fetchData = useCallback(async () => {
    if (!realtimeConfig.enabled) return

    try {
      setIsLoading(true)
      const result = await getAlertsAction()

      if (result.success && result.alerts) {
        setAlerts(result.alerts)
        errorCountRef.current = 0
        setConnectionStatus(resetConnectionStatus())
      } else {
        throw new Error(result.error ?? 'Failed to fetch alerts')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      errorCountRef.current += 1
      setConnectionStatus((prev) => handleConnectionError(prev, errorMessage))

      const retryInterval = getRetryInterval(errorCountRef.current)
      retryTimeoutRef.current = setTimeout(fetchData, retryInterval)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    if (!realtimeConfig.enabled) return
    if (pollIntervalRef.current) return

    pollIntervalRef.current = setInterval(() => {
      if (isVisibleRef.current) fetchData()
    }, realtimeConfig.pollingInterval)
  }, [fetchData])

  const refresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

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

  // Pause when tab goes to background; resume immediately when tab regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden
      if (document.hidden) {
        setConnectionStatus(pauseConnectionStatus)
      } else {
        setConnectionStatus(resumeConnectionStatus)
        fetchData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchData])

  // Start / stop polling on mount / unmount
  useEffect(() => {
    if (realtimeConfig.enabled) startPolling()
    return () => stopPolling()
  }, [startPolling, stopPolling])

  return { alerts, connectionStatus, isLoading, refresh, reconnect }
}
