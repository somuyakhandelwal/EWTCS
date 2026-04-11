'use server'

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

export async function getDepartmentMetrics() {
  try {
    // 1. Triage metrics: occupied triage beds and average time spent in triage.
    // NOTE: triage_stage is a single CTE lookup (one subquery, no per-row loop)
    // that is reused by downstream CTEs via joins.
    const intakeQuery = query(`
      WITH triage_stage AS (
        SELECT id
        FROM stages
        WHERE LOWER(name) = 'triage'
        LIMIT 1
      ),
      triage_beds AS (
        SELECT b.id, b.is_occupied
        FROM beds b
        JOIN triage_stage ts ON b.current_stage_id = ts.id
        WHERE b.is_active = true
      ),
      recent_intake AS (
        SELECT DISTINCT bed_id
        FROM er_intake
        WHERE bed_id IS NOT NULL
          AND registered_at >= NOW() - INTERVAL '7 days'
      ),
      triage_durations AS (
        SELECT bsl.bed_id, bsl.duration_in_previous_stage_ms
        FROM bed_stage_logs bsl
        JOIN triage_stage ts ON bsl.from_stage_id = ts.id
        WHERE bsl.duration_in_previous_stage_ms IS NOT NULL
      )
      SELECT
        (SELECT COUNT(*) FROM triage_beds WHERE is_occupied = true) AS occupied_beds,
        (SELECT COUNT(*) FROM triage_beds) AS total_beds,
        COALESCE(
          ROUND(AVG(td.duration_in_previous_stage_ms) / 60000.0, 1),
          0
        ) AS avg_triage_time
      FROM triage_durations td
      JOIN recent_intake ri ON ri.bed_id = td.bed_id
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
