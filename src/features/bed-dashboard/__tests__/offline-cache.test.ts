/**
 * offline-cache.test.ts
 * US-16.1: Cache Data Locally
 * Unit tests for the offline-cache utility — saveToCache, loadFromCache,
 * cache expiry, version-mismatch invalidation, and size limits.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoist mock so it applies before any import that depends on realtimeConfig ──
vi.mock('@/shared/config/realtime', () => ({
  realtimeConfig: {
    cacheEnabled: true,
    cacheKey: 'ewtcs_bed_grid_cache',
    cacheVersion: 'v1',
    cacheExpiryMs: 300_000, // 5 min
    cacheMaxSizeBytes: 1_572_864, // 1.5 MB
  },
}))

import { saveToCache, loadFromCache, clearCache, isCacheValid } from '../lib/offline-cache'
import type { BedGridData } from '../types/bed'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMinimalBedGridData(): BedGridData {
  return {
    beds: [],
    stages: [],
    delayThresholdMs: 10_800_000,
    escalationThresholdMs: 21_600_000,
    bottleneckCount: 0,
    escalationCount: 0,
  }
}

const CACHE_KEY = 'ewtcs_bed_grid_cache'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('saveToCache', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('writes a versioned, timestamped entry to localStorage', () => {
    const data = makeMinimalBedGridData()
    saveToCache(data)

    const raw = localStorage.getItem(CACHE_KEY)
    expect(raw).not.toBeNull()

    const entry = JSON.parse(raw!)
    expect(entry.version).toBe('v1')
    expect(typeof entry.timestamp).toBe('number')
    expect(entry.data).toEqual(data)
  })

  it('overwrites a previous entry on subsequent saves', () => {
    const data1 = makeMinimalBedGridData()
    const data2 = { ...makeMinimalBedGridData(), bottleneckCount: 3 }

    saveToCache(data1)
    saveToCache(data2)

    const raw = localStorage.getItem(CACHE_KEY)
    const entry = JSON.parse(raw!)
    expect(entry.data.bottleneckCount).toBe(3)
  })

  it('skips write and warns when payload exceeds the size limit', async () => {
    // Temporarily lower the limit via the mocked module to trigger the guard
    const mod = await import('@/shared/config/realtime')
    const config = mod.realtimeConfig as unknown as Record<string, unknown>
    const originalMax = config.cacheMaxSizeBytes
    config.cacheMaxSizeBytes = 5 // 5 bytes — any realistic payload exceeds this

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    saveToCache(makeMinimalBedGridData())

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cache write skipped')
    )
    expect(localStorage.getItem(CACHE_KEY)).toBeNull()

    warnSpy.mockRestore()
    config.cacheMaxSizeBytes = originalMax
  })
})

describe('loadFromCache', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when no cache entry exists', () => {
    expect(loadFromCache()).toBeNull()
  })

  it('returns the cached data and timestamp on a valid, fresh entry', () => {
    const data = makeMinimalBedGridData()
    saveToCache(data)

    const result = loadFromCache()
    expect(result).not.toBeNull()
    expect(result!.data).toEqual(data)
    expect(typeof result!.timestamp).toBe('number')
  })

  it('returns null and removes entry when cache has expired', () => {
    const now = Date.now()
    const expiredTimestamp = now - 400_000 // 400s ago > 300s expiry

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ version: 'v1', timestamp: expiredTimestamp, data: makeMinimalBedGridData() })
    )

    expect(loadFromCache()).toBeNull()
    expect(localStorage.getItem(CACHE_KEY)).toBeNull()
  })

  it('returns null and removes entry when version does not match', () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ version: 'v0', timestamp: Date.now(), data: makeMinimalBedGridData() })
    )

    expect(loadFromCache()).toBeNull()
    expect(localStorage.getItem(CACHE_KEY)).toBeNull()
  })

  it('returns null and removes entry when JSON is malformed', () => {
    localStorage.setItem(CACHE_KEY, 'not-valid-json')
    expect(loadFromCache()).toBeNull()
    expect(localStorage.getItem(CACHE_KEY)).toBeNull()
  })
})

describe('isCacheValid', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns false when no cache exists', () => {
    expect(isCacheValid()).toBe(false)
  })

  it('returns true when a valid, fresh cache exists', () => {
    saveToCache(makeMinimalBedGridData())
    expect(isCacheValid()).toBe(true)
  })
})

describe('clearCache', () => {
  it('removes the cache entry from localStorage', () => {
    saveToCache(makeMinimalBedGridData())
    expect(localStorage.getItem(CACHE_KEY)).not.toBeNull()

    clearCache()
    expect(localStorage.getItem(CACHE_KEY)).toBeNull()
  })

  it('does not throw when called with no existing entry', () => {
    localStorage.clear()
    expect(() => clearCache()).not.toThrow()
  })
})
