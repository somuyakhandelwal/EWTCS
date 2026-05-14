// Offline Cache Utility
// US-16.1: Cache Data Locally
// Persists BedGridData to localStorage so the dashboard can serve stale data
// when the network is unavailable.

import { realtimeConfig } from '@/shared/config/realtime'
import { logger } from '@/shared/config/logger'
import type { BedGridData } from '../types/bed'

/** Shape stored in localStorage */
interface CacheEntry {
  /** Semver-style version tag — mismatched entries are discarded on read */
  version: string
  /** Unix epoch ms when this entry was written */
  timestamp: number
  /** The cached payload */
  data: BedGridData
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Guard: localStorage is unavailable in SSR and some private-browsing modes */
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const probe = '__ewtcs_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────
export function saveToCache(data: BedGridData): void {
  if (!realtimeConfig.cacheEnabled) return
  if (!isStorageAvailable()) return

  const entry: CacheEntry = {
    version: realtimeConfig.cacheVersion,
    timestamp: Date.now(),
    data,
  }

  const serialised = JSON.stringify(entry)

  // AC: Cache size is limited to prevent browser issues
  if (serialised.length > realtimeConfig.cacheMaxSizeBytes) {
    logger.warn('Cache write skipped: payload exceeds size limit', {
      sizeBytes: serialised.length,
      limitBytes: realtimeConfig.cacheMaxSizeBytes
    })
    return
  }

  try {
    localStorage.setItem(realtimeConfig.cacheKey, serialised)
  } catch (error) {
    // QuotaExceededError — storage is full; continue without caching
    logger.warn('Cache write failed: localStorage quota exceeded', { error })
  }
}

/**
 * Read the cached BedGridData from localStorage.
 *
 * Returns `null` if:
 * - localStorage is unavailable
 * - caching is disabled
 * - no cache entry exists
 * - entry version does not match current `cacheVersion` (schema changed)
 * - entry has expired (older than `cacheExpiryMs`)
 */
export function loadFromCache(): { data: BedGridData; timestamp: number } | null {
  if (!realtimeConfig.cacheEnabled) return null
  if (!isStorageAvailable()) return null

  try {
    const raw = localStorage.getItem(realtimeConfig.cacheKey)
    if (!raw) return null

    const entry: CacheEntry = JSON.parse(raw) as CacheEntry

    // AC: Cache expiry
    const ageMs = Date.now() - entry.timestamp
    if (ageMs > realtimeConfig.cacheExpiryMs) {
      localStorage.removeItem(realtimeConfig.cacheKey)
      return null
    }

    // Version guard — discard stale schema
    if (entry.version !== realtimeConfig.cacheVersion) {
      localStorage.removeItem(realtimeConfig.cacheKey)
      return null
    }

    return { data: entry.data, timestamp: entry.timestamp }
  } catch {
    // Malformed JSON or unexpected shape — discard
    try { localStorage.removeItem(realtimeConfig.cacheKey) } catch { /* ignore */ }
    return null
  }
}

/**
 * Check if a cached entry exists and is within the expiry window,
 * without actually returning the data.
 */
export function isCacheValid(): boolean {
  return loadFromCache() !== null
}

/**
 * Remove the cache entry from localStorage.
 * Call this on logout to prevent stale, potentially sensitive data persisting.
 */
export function clearCache(): void {
  if (!isStorageAvailable()) return
  try {
    localStorage.removeItem(realtimeConfig.cacheKey)
  } catch { /* ignore */ }
}

/**
 * Fetch a fresh server-side snapshot if local cache is unavailable.
 * Intended for reconnect recovery when client cache is empty.
 */
export async function fetchServerSnapshot(): Promise<{ data: BedGridData; timestamp: number } | null> {
  if (typeof window === 'undefined') return null

  try {
    const response = await fetch('/api/bed-dashboard/snapshot', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    })

    if (!response.ok) {
      return null
    }

    const payload = await response.json() as {
      success?: boolean
      data?: BedGridData
      timestamp?: number
    }

    if (!payload.success || !payload.data) {
      return null
    }

    const timestamp = typeof payload.timestamp === 'number' ? payload.timestamp : Date.now()
    return { data: payload.data, timestamp }
  } catch {
    return null
  }
}
