// Connection Manager
// Handles retry logic and connection status updates for real-time polling

import { realtimeConfig } from '@/shared/config/realtime'
import type { ConnectionStatus, ConnectionStatusDetails } from '../types/realtime'

/**
 * Calculate next retry interval with exponential backoff
 * @param errorCount - Number of consecutive errors
 * @returns Next retry interval in milliseconds
 */
export function getRetryInterval(errorCount: number): number {
  const baseInterval = realtimeConfig.retryInterval
  const exponentialInterval = baseInterval * Math.pow(2, Math.min(errorCount, 4))
  return Math.min(exponentialInterval, realtimeConfig.maxRetryInterval)
}

/**
 * Update connection status based on error
 * @param prevStatus - Previous connection status
 * @param errorMessage - Error message from failed request
 * @returns Updated connection status
 */
export function handleConnectionError(
  prevStatus: ConnectionStatusDetails,
  errorMessage: string
): ConnectionStatusDetails {
  const newErrorCount = prevStatus.errorCount + 1
  const status: ConnectionStatus = newErrorCount >= 3 ? 'disconnected' : 'reconnecting'
  
  return {
    status,
    lastUpdate: prevStatus.lastUpdate,
    errorCount: newErrorCount,
    errorMessage,
  }
}

/**
 * Reset connection status to connected
 * @returns Fresh connected status
 */
export function resetConnectionStatus(): ConnectionStatusDetails {
  return {
    status: 'connected',
    lastUpdate: new Date(),
    errorCount: 0,
  }
}

/**
 * Update connection status to paused
 * @param prevStatus - Previous connection status
 * @returns Updated paused status
 */
export function pauseConnectionStatus(
  prevStatus: ConnectionStatusDetails
): ConnectionStatusDetails {
  return {
    ...prevStatus,
    status: 'paused',
  }
}

/**
 * Resume connection status from paused state
 * @param prevStatus - Previous connection status
 * @returns Updated resumed status
 */
export function resumeConnectionStatus(
  prevStatus: ConnectionStatusDetails
): ConnectionStatusDetails {
  return {
    ...prevStatus,
    status: prevStatus.errorCount > 0 ? 'reconnecting' : 'connected',
  }
}
