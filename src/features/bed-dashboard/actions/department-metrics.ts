'use server'

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

export async function getDepartmentMetrics() {
  try {
    // 1. Triage metrics: Bed occupancy, average triage time
    const intakeRes = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE occupancy_status = 'occupied') as occupied_beds,
        COUNT(*) as total_beds,
        ROUND(AVG(triage_time_minutes), 1) as avg_triage_time
      FROM er_intake
    `)
    const triageMetrics = intakeRes.rows[0] || { occupied_beds: 0, total_beds: 0, avg_triage_time: 0 }
    
    // 2. OT metrics: Surgeries in progress, completed, utilization rate
    const otRes = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) as total_surgeries
      FROM ot_procedures
    `)
    const otMetrics = otRes.rows[0] || { in_progress: 0, completed: 0, total_surgeries: 0 }
    // Utilization could be considered as total in progress vs something, or just return basic stats
    const utilizationRate = otMetrics.total_surgeries > 0 
      ? Math.round((Number(otMetrics.in_progress) / Number(otMetrics.total_surgeries)) * 100)
      : 0

    // 3. Cath Lab metrics: Active procedures, CAG/PTCA counts
    const cathRes = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active_procedures,
        COUNT(*) FILTER (WHERE procedure_type = 'CAG') as cag_count,
        COUNT(*) FILTER (WHERE procedure_type = 'PTCA') as ptca_count
      FROM cath_lab_procedures
    `)
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
