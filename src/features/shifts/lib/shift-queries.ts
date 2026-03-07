// Shift Queries
// EPIC 8: Shift Management (US-8.1, US-8.2, US-8.3, US-8.4)
// Purpose: Read shifts and compute per-shift performance metrics.

import 'server-only'

import { query } from '@/shared/lib/db'
import { config } from '@/shared/config/env'
import type { Shift, ShiftPerformance } from '../types/shift'

interface ShiftRow {
  id: string
  name: string
  start_time: string
  end_time: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

function rowToShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    name: row.name,
    startTime: row.start_time,
    endTime: row.end_time,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Fetch all shifts, active first then by name. */
export async function getShifts(): Promise<Shift[]> {
  const result = await query<ShiftRow>(
    `SELECT id, name, start_time, end_time, is_active, created_at, updated_at
     FROM   shifts
     ORDER  BY is_active DESC, name ASC`
  )
  return result.rows.map(rowToShift)
}

/**
 * Find the shift (if any) that covers a given UTC timestamp.
 * The lookup converts the timestamp to the local wall-clock time for matching.
 * Overnight shifts like Night (22:00–06:00) are handled by checking the
 * wrap-around case (start > end).
 */
export async function getShiftForTime(atTime: Date): Promise<Shift | null> {
  const result = await query<ShiftRow>(
    `SELECT id, name, start_time, end_time, is_active, created_at, updated_at
     FROM   shifts
     WHERE  is_active = true
       AND  (
              -- Normal shift: start <= time < end (same day)
              (start_time < end_time AND $1::time BETWEEN start_time AND end_time)
              OR
              -- Overnight shift: time >= start OR time < end
              (start_time > end_time AND ($1::time >= start_time OR $1::time < end_time))
            )
     LIMIT 1`,
    [atTime.toTimeString().slice(0, 8)]  // 'HH:MM:SS'
  )
  return result.rows.length > 0 ? rowToShift(result.rows[0]) : null
}

interface PerformanceRow {
  shift_id: string
  shift_name: string
  start_time: string
  end_time: string
  total_transitions: string
  beds_used: string
  avg_tat_ms: string | null
  delayed_transitions: string
}

/**
 * Compute performance metrics per active shift for a given date range.
 * A transition is counted as "delayed" if its duration_in_previous_stage_ms
 * exceeds the configured global delay threshold.
 */
export async function getShiftPerformance(
  startDate: Date,
  endDate: Date
): Promise<ShiftPerformance[]> {
  const delayThresholdMs = config.alert.delayThresholdMs

  const result = await query<PerformanceRow>(
    `SELECT
       s.id                                            AS shift_id,
       s.name                                          AS shift_name,
       s.start_time,
       s.end_time,
       COUNT(l.id)                                     AS total_transitions,
       COUNT(DISTINCT l.bed_id)                        AS beds_used,
       AVG(
         EXTRACT(EPOCH FROM (
           CASE WHEN b.patient_start_time IS NOT NULL
                     AND l.to_stage_id IN (
                       SELECT id FROM stages
                       WHERE name IN ('Empty','Cleaning') AND is_active = true
                     )
                THEN l.transition_time - b.patient_start_time
           END
         )) * 1000
       )::BIGINT                                       AS avg_tat_ms,
       COUNT(CASE WHEN l.duration_in_previous_stage_ms > $3 THEN 1 END)
                                                       AS delayed_transitions
     FROM   shifts s
     LEFT JOIN bed_stage_logs l
            ON l.shift_id = s.id
           AND l.transition_time BETWEEN $1 AND $2
     LEFT JOIN beds b ON b.id = l.bed_id
     WHERE  s.is_active = true
     GROUP  BY s.id, s.name, s.start_time, s.end_time
     ORDER  BY s.name`,
    [startDate, endDate, delayThresholdMs]
  )

  return result.rows.map((row) => {
    const total = parseInt(row.total_transitions, 10)
    const delayed = parseInt(row.delayed_transitions, 10)
    return {
      shiftId:            row.shift_id,
      shiftName:          row.shift_name,
      startTime:          row.start_time,
      endTime:            row.end_time,
      totalTransitions:   total,
      bedsUsed:           parseInt(row.beds_used, 10),
      averageTATMs:       row.avg_tat_ms ? parseInt(row.avg_tat_ms, 10) : null,
      delayedTransitions: delayed,
      delayRate:          total > 0 ? delayed / total : 0,
    }
  })
}
