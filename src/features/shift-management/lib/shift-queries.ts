// Shift Management Queries (US-8.1)
// Epic 8: Shift Management

import { query } from '@/shared/lib/db'
import type { Shift } from '../types/shift.types'

// ---------------------------------------------------------------------------
// Internal row type from PostgreSQL
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Return all active shifts ordered by start_time.
 * Includes computed `crosses_midnight` flag for Night-shift handling.
 */
export async function getShifts(): Promise<Shift[]> {
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
    ORDER BY start_time ASC
    `
  )
  return result.rows as Shift[]
}

/**
 * Return a single shift by ID (active or inactive).
 */
export async function getShiftById(id: string): Promise<Shift | null> {
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
    WHERE id = $1
    `,
    [id]
  )
  return result.rows[0] ?? null
}

/**
 * Return all shifts (including inactive) — used by the admin page.
 */
export async function getAllShifts(): Promise<Shift[]> {
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
    ORDER BY start_time ASC
    `
  )
  return result.rows as Shift[]
}
