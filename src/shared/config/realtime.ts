// Real-time Configuration
// Centralized configuration for real-time updates

import type { RealtimeConfig } from '@/features/bed-dashboard/types/realtime'

/**
 * Get real-time update configuration from environment
 */
export function getRealtimeConfig(): RealtimeConfig {
  return {
    enabled: process.env.NEXT_PUBLIC_REALTIME_ENABLED !== 'false',
    pollingInterval: parseInt(process.env.NEXT_PUBLIC_REALTIME_POLLING_INTERVAL_MS || '3000', 10),
    retryInterval: parseInt(process.env.NEXT_PUBLIC_REALTIME_RETRY_INTERVAL_MS || '10000', 10),
    maxRetryInterval: parseInt(process.env.NEXT_PUBLIC_REALTIME_MAX_RETRY_INTERVAL_MS || '30000', 10),
  }
}

/**
 * Real-time configuration instance
 */
export const realtimeConfig = getRealtimeConfig()
