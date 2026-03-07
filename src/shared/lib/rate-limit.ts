/**
 * In-Memory Rate Limiter
 * US-19.1: REST API rate limiting for external v1 endpoints
 *
 * Sliding-window counter stored in a module-level Map.
 * Works across requests within a single Node.js process.
 * For multi-instance deployments, replace with a Redis-backed counter.
 *
 * Default: 60 requests / 60 seconds per IP
 */

interface RateLimitEntry {
  count: number
  windowStart: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now - entry.windowStart > 120_000) {
      store.delete(key)
    }
  }
}, 300_000).unref()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number  // Unix timestamp (seconds)
}

/**
 * Check and apply rate limit for a given key (usually client IP).
 *
 * @param key       Identifier to rate-limit (e.g. IP address)
 * @param limit     Maximum requests allowed per window (default: 60)
 * @param windowMs  Window duration in milliseconds (default: 60 000)
 */
export function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.windowStart >= windowMs) {
    // Start a fresh window
    store.set(key, { count: 1, windowStart: now })
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: Math.ceil((now + windowMs) / 1000),
    }
  }

  entry.count++
  const remaining = Math.max(limit - entry.count, 0)
  const resetAt    = Math.ceil((entry.windowStart + windowMs) / 1000)

  return {
    allowed: entry.count <= limit,
    remaining,
    resetAt,
  }
}
