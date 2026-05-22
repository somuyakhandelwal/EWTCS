'use server'

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

export async function getDepartmentMetrics() {
  try {
    // 1. Triage Area metrics: occupied beds in the TRIAGE ward and average
    // completed triage TAT for the last 7 days.
    // NOTE: Triage is a SEPARATE WARD (code='TRIAGE'), NOT an ER stage (U.S 25.2).
    // Whole triage TAT ends when the triage bed enters cleaning.
    const intakeQuery = query(`
      WITH triage_ward AS (
        SELECT id
        FROM wards
        WHERE code = 'TRIAGE' AND is_active = true
        LIMIT 1
      ),
      triage_beds AS (
        SELECT b.id, b.is_occupied
        FROM beds b
        JOIN triage_ward tw ON b.ward_id = tw.id
        WHERE b.is_active = true
      ),
      triage_start_events AS (
        SELECT
          tsl.bed_id,
          tsl.transition_time AS started_at
        FROM triage_state_logs tsl
        JOIN triage_beds tb ON tb.id = tsl.bed_id
        WHERE tsl.to_state = 'initial_treatment'
      ),
      triage_cleaning_events AS (
        SELECT
          tsl.bed_id,
          tsl.transition_time AS cleaning_at,
          LAG(tsl.transition_time) OVER (
            PARTITION BY tsl.bed_id
            ORDER BY tsl.transition_time ASC
          ) AS previous_cleaning_at
        FROM triage_state_logs tsl
        JOIN triage_beds tb ON tb.id = tsl.bed_id
        WHERE tsl.to_state = 'cleaning'
          AND tsl.transition_time >= NOW() - INTERVAL '7 days'
      ),
      triage_cycles AS (
        SELECT
          ce.bed_id,
          EXTRACT(EPOCH FROM (ce.cleaning_at - se.started_at)) * 1000 AS duration_ms
        FROM triage_cleaning_events ce
        JOIN LATERAL (
          SELECT s.started_at
          FROM triage_start_events s
          WHERE s.bed_id = ce.bed_id
            AND s.started_at < ce.cleaning_at
            AND (
              ce.previous_cleaning_at IS NULL
              OR s.started_at > ce.previous_cleaning_at
            )
          ORDER BY s.started_at DESC
          LIMIT 1
        ) se ON true
      )
      SELECT
        (SELECT COUNT(*) FROM triage_beds WHERE is_occupied = true) AS occupied_beds,
        (SELECT COUNT(*) FROM triage_beds) AS total_beds,
        COALESCE(
          ROUND(AVG(tc.duration_ms) / 60000.0, 1),
          0
        ) AS avg_triage_time
      FROM triage_cycles tc
    `)
    
    // 2. OT metrics: in-progress/completed surgeries and room utilization.
    const otQuery = query(`
      WITH room_capacity AS (
        SELECT COUNT(*) AS total_rooms
        FROM ot_rooms
      )
      SELECT
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
        (SELECT total_rooms FROM room_capacity) AS total_rooms
      FROM ot_procedures
    `)

    // 3. Cath Lab metrics: Active procedures, CAG/PTCA counts
    const cathQuery = query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS active_procedures,
        COUNT(*) FILTER (WHERE UPPER(procedure_type) = 'CAG') AS cag_count,
        COUNT(*) FILTER (WHERE UPPER(procedure_type) = 'PTCA') AS ptca_count
      FROM cath_lab_procedures
    `)

    const [intakeRes, otRes, cathRes] = await Promise.all([intakeQuery, otQuery, cathQuery])

    const triageMetrics = intakeRes.rows[0] || { occupied_beds: 0, total_beds: 0, avg_triage_time: 0 }
    const otMetrics = otRes.rows[0] || { in_progress: 0, completed: 0, total_rooms: 0 }
    const utilizationRate = Number(otMetrics.total_rooms) > 0
      ? Math.round((Number(otMetrics.in_progress) / Number(otMetrics.total_rooms)) * 100)
      : 0
    const cathMetrics = cathRes.rows[0] || { active_procedures: 0, cag_count: 0, ptca_count: 0 }

    return {
      success: true,
      data: {
        triage: {
          occupiedBeds: Number(triageMetrics.occupied_beds) || 0,
          totalBeds: Number(triageMetrics.total_beds) || 0,
          avgTriageTime: Number(triageMetrics.avg_triage_time) || 0,
        },
        ot: {
          inProgress: Number(otMetrics.in_progress) || 0,
          completed: Number(otMetrics.completed) || 0,
          utilizationRate,
        },
        cathLab: {
          activeProcedures: Number(cathMetrics.active_procedures) || 0,
          cagCount: Number(cathMetrics.cag_count) || 0,
          ptcaCount: Number(cathMetrics.ptca_count) || 0,
        }
      }
    }
  } catch (error) {
    logger.error('Failed to get department metrics', error as Error)
    return { success: false, error: 'Database error fetching metrics' }
  }
}
