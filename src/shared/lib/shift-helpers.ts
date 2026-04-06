import { query } from '@/shared/lib/db'

/**
 * SHIFT_AUTOTAG_SUBQUERY
 * US-8.2: Inline subquery that resolves the active shift for the current
 * wall-clock time. Handles the Night shift that crosses midnight
 * (start_time > end_time).
 * Single source of truth — imported by bed-mutations.constants.ts and discharge-queries.ts
 */
export const SHIFT_AUTOTAG_SUBQUERY = `
  (
    SELECT s.id
    FROM   shifts s
    WHERE  s.is_active = TRUE
      AND (
        (s.start_time <= s.end_time
           AND NOW()::time >= s.start_time
           AND NOW()::time <  s.end_time)
        OR
        (s.start_time > s.end_time
           AND (NOW()::time >= s.start_time OR NOW()::time < s.end_time))
      )
    ORDER BY s.is_default DESC, s.created_at ASC
    LIMIT 1
  )
`

type ActiveShiftRow = { id: string }

let cachedBucket: number | null = null
let cachedShiftId: string | null = null
let inflightLookup: { bucket: number; promise: Promise<string | null> } | null = null

/**
 * Resolve active shift id once per minute bucket.
 * Cache key: Math.floor(Date.now() / 60000)
 */
export async function resolveActiveShiftIdCached(nowMs: number = Date.now()): Promise<string | null> {
  const bucket = Math.floor(nowMs / 60000)

  if (cachedBucket === bucket) {
    return cachedShiftId
  }

  if (inflightLookup && inflightLookup.bucket === bucket) {
    return inflightLookup.promise
  }

  const promise = (async () => {
    const result = await query<ActiveShiftRow>(`
      SELECT s.id
      FROM shifts s
      WHERE s.is_active = TRUE
        AND (
          (s.start_time <= s.end_time
            AND NOW()::time >= s.start_time
            AND NOW()::time < s.end_time)
          OR
          (s.start_time > s.end_time
            AND (NOW()::time >= s.start_time OR NOW()::time < s.end_time))
        )
      ORDER BY s.is_default DESC, s.created_at ASC
      LIMIT 1
    `)

    const shiftId = result.rows[0]?.id ?? null
    cachedBucket = bucket
    cachedShiftId = shiftId
    return shiftId
  })()

  inflightLookup = { bucket, promise }

  try {
    return await promise
  } finally {
    if (inflightLookup?.bucket === bucket) {
      inflightLookup = null
    }
  }
}
