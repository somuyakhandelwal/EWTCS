import 'server-only'
// EPIC 13: Query Result Caching — System Performance & Reliability
//
// Wraps expensive DB query functions with Next.js `unstable_cache` to serve
// cached results across requests, reducing DB load and bringing page load times
// inside the Dashboard <2 s / Reports <3 s SLA targets.
//
// Cache invalidation strategy:
//   - Analytics data: revalidates every 60 s (low churn, high cost queries).
//   - System settings: revalidated on mutation via `revalidateTag`.

import { unstable_cache } from 'next/cache'

/** Cache tag for analytics queries. Used with `revalidateTag` after data mutations. */
export const ANALYTICS_CACHE_TAG = 'analytics'

/** Cache tag for system-settings queries. Used with `revalidateTag` after writes. */
export const SETTINGS_CACHE_TAG = 'system-settings'

/** Default TTL (seconds) for analytics result cache. */
export const ANALYTICS_CACHE_TTL_S = 60

/** Default TTL (seconds) for system-settings result cache. */
export const SETTINGS_CACHE_TTL_S = 120

/**
 * Wraps an async function with Next.js server-side result caching.
 *
 * Results are stored in the Next.js in-process cache and shared across all
 * concurrent requests, so parallel calls for the same arguments hit the DB
 * only once per TTL window.
 *
 * @param fn          - Pure async function whose result should be cached.
 * @param keyPrefix   - Stable string that uniquely identifies the function.
 * @param ttlSeconds  - How long (in seconds) the cached result is valid.
 * @param tags        - Cache tags that allow on-demand invalidation via `revalidateTag`.
 */
export function withCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyPrefix: string,
  ttlSeconds: number,
  tags: string[] = [],
): (...args: TArgs) => Promise<TResult> {
  return unstable_cache(fn, [keyPrefix], {
    revalidate: ttlSeconds,
    tags,
  }) as (...args: TArgs) => Promise<TResult>
}
