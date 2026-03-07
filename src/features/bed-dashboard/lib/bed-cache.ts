/**
 * Browser Cache Utility
 * US-16.1: Cache Dashboard Data Locally
 *
 * Stores bed grid data in sessionStorage so that when the network
 * is unavailable the dashboard can still display the last known state.
 *
 * - Cache key: scoped to prevent stale data from different sessions
 * - Cache expiry: configurable (default 5 minutes)
 * - Size limit: capped at 1 MB before writing
 */

'use client'

const CACHE_KEY = 'ewtcs:bed-grid-cache'
const CACHE_MAX_AGE_MS = 5 * 60 * 1000  // 5 minutes
const CACHE_MAX_BYTES  = 1_000_000       // 1 MB

interface CacheEntry<T> {
  data: T
  savedAt: number
}

/**
 * Write `data` to sessionStorage under `CACHE_KEY`.
 * Silently no-ops if storage is unavailable or data is too large.
 */
export function writeBedCache<T>(data: T): void {
  try {
    const entry: CacheEntry<T> = { data, savedAt: Date.now() }
    const serialised = JSON.stringify(entry)
    if (serialised.length > CACHE_MAX_BYTES) return  // don't cache oversized payloads
    sessionStorage.setItem(CACHE_KEY, serialised)
  } catch {
    // Private browsing or storage full — ignore
  }
}

/**
 * Read previously cached data.
 * Returns `null` when the cache is missing, expired, or malformed.
 */
export function readBedCache<T>(): T | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() - entry.savedAt > CACHE_MAX_AGE_MS) {
      sessionStorage.removeItem(CACHE_KEY)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

/** Remove the cached entry (e.g. on logout). */
export function clearBedCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY)
  } catch {
    // ignore
  }
}

/** How old the cache is, in seconds. Returns null if no cache. */
export function bedCacheAgeSeconds(): number | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<unknown>
    return Math.floor((Date.now() - entry.savedAt) / 1000)
  } catch {
    return null
  }
}
