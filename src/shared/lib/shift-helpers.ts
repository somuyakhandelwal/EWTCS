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
