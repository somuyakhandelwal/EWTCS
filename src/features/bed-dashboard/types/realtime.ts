// Real-time Update Types
// Epic 1: Nurse Desk Bed Dashboard
// US-1.2: Display Real-Time Bed Status

/**
 * Connection status for real-time updates
 */
export type ConnectionStatus = 
  | 'connected'      // Green: Active polling, recent successful update
  | 'reconnecting'   // Yellow: Attempting to reconnect after error
  | 'disconnected'   // Red: Multiple failed attempts
  | 'paused'         // Gray: Polling paused (tab inactive)

/**
 * Real-time update configuration
 */
export interface RealtimeConfig {
  /** Whether real-time updates are enabled */
  enabled: boolean
  /** Polling interval in milliseconds */
  pollingInterval: number
  /** Retry interval after error */
  retryInterval: number
  /** Maximum retry interval (exponential backoff cap) */
  maxRetryInterval: number
}

/**
 * Connection status details
 */
export interface ConnectionStatusDetails {
  /** Current connection state */
  status: ConnectionStatus
  /** Last successful update timestamp */
  lastUpdate: Date | null
  /** Number of consecutive errors */
  errorCount: number
  /** Current error message if any */
  errorMessage?: string
}

/**
 * Return type for useRealtimeBedUpdates hook
 */
export interface UseRealtimeBedUpdatesReturn<T> {
  /** Current data (updates in real-time) */
  data: T
  /** Connection status details */
  connectionStatus: ConnectionStatusDetails
  /** Whether data is currently being fetched */
  isLoading: boolean
  /** Manually trigger refresh */
  refresh: () => Promise<void>
  /** Manually reconnect if disconnected */
  reconnect: () => void
}
