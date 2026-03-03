// Real-time Configuration
// Centralized configuration for real-time updates

/**
 * Real-time update configuration.
 * Defined here (shared) because getRealtimeConfig() produces it from env vars.
 * Re-exported by features/bed-dashboard/types/realtime.ts for backward compat.
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
  // --- US-16.1: Offline Cache ---
  /** Whether browser-side caching is enabled (US-16.1) */
  cacheEnabled: boolean
  /** localStorage key used to store the bed grid cache */
  cacheKey: string
  /** Cache entry version — bump when BedGridData shape changes to auto-invalidate stale cache */
  cacheVersion: string
  /** How long (ms) a cache entry is considered fresh (default: 5 min) */
  cacheExpiryMs: number
  /** Maximum allowed byte size of a serialised cache entry (default: 1.5 MB) */
  cacheMaxSizeBytes: number
}

/**
 * Get real-time update configuration from environment
 */
export function getRealtimeConfig(): RealtimeConfig {
  return {
    enabled: process.env.NEXT_PUBLIC_REALTIME_ENABLED !== 'false',
    pollingInterval: parseInt(process.env.NEXT_PUBLIC_REALTIME_POLLING_INTERVAL_MS || '3000', 10),
    retryInterval: parseInt(process.env.NEXT_PUBLIC_REALTIME_RETRY_INTERVAL_MS || '10000', 10),
    maxRetryInterval: parseInt(process.env.NEXT_PUBLIC_REALTIME_MAX_RETRY_INTERVAL_MS || '30000', 10),
    // US-16.1: Offline Cache
    cacheEnabled: process.env.NEXT_PUBLIC_CACHE_ENABLED !== 'false',
    cacheKey: process.env.NEXT_PUBLIC_CACHE_KEY || 'ewtcs_bed_grid_cache',
    cacheVersion: process.env.NEXT_PUBLIC_CACHE_VERSION || 'v1',
    cacheExpiryMs: parseInt(process.env.NEXT_PUBLIC_CACHE_EXPIRY_MS || '300000', 10),
    cacheMaxSizeBytes: parseInt(process.env.NEXT_PUBLIC_CACHE_MAX_SIZE_BYTES || '1572864', 10),
  }
}

/**
 * Real-time configuration instance
 */
export const realtimeConfig = getRealtimeConfig()
