// Shift Resolution Utility (US-8.2)
// Epic 8: Shift Management
//
// Resolves which shift is active at a given wall-clock time.
// Handles the Night shift that crosses midnight (start_time > end_time).
//
// SERVER-ONLY: this module imports pg (Node.js). Never import from client components.
import 'server-only'

import { query } from '@/shared/lib/db'
import type { Shift } from '../types/shift.types'

interface ShiftRow {
  id: string
  name: string
  start_time: string
  end_time: string
  crosses_midnight: boolean
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Resolve the active shift for a given timestamp (defaults to NOW).
 *
 * Logic:
 *  - Normal shift  (start < end):  active when  start <= t < end
 *  - Midnight-wrap (start > end):  active when  t >= start  OR  t < end
 *
 * When multiple shifts match (overlapping transition periods), the default
 * shift wins; ties are broken by earliest created_at.
 *
 * Returns null if no shift covers the given time.
 */
export async function resolveCurrentShift(at?: Date): Promise<Shift | null> {
  const t = at ?? new Date()
  // Extract HH:MM:SS from the local wall-clock time as a PostgreSQL TIME literal
  const hh  = t.getHours().toString().padStart(2, '0')
  const mm  = t.getMinutes().toString().padStart(2, '0')
  const ss  = t.getSeconds().toString().padStart(2, '0')
  const timeStr = `${hh}:${mm}:${ss}`

  const result = await query<ShiftRow>(
    `
    SELECT
      id,
      name,
      start_time::text   AS start_time,
      end_time::text     AS end_time,
      (start_time > end_time) AS crosses_midnight,
      is_default,
      is_active,
      created_at::text   AS created_at,
      updated_at::text   AS updated_at
    FROM shifts
    WHERE is_active = TRUE
      AND (
        -- Normal shift: start_time <= query_time < end_time
        (start_time <= end_time AND $1::time >= start_time AND $1::time < end_time)
        OR
        -- Midnight-crossing shift: query_time >= start OR query_time < end
        (start_time > end_time  AND ($1::time >= start_time OR $1::time < end_time))
      )
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1
    `,
    [timeStr]
  )

  if (result.rows.length === 0) return null
  return result.rows[0] as Shift
}

// formatShiftTime has moved to ./shift-format.ts (client-safe pure helper).
export { formatShiftTime } from './shift-format'
