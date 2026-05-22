'use server'

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import {
  getErCleaningTatSummary,
  getErTatSummary,
  getTriageCleaningTatSummary,
  getTriageTatSummary,
  type DurationMetricSummary,
} from '../lib/stage-analytics'
import type { DepartmentMetrics } from '../types/department-metrics'

interface OccupancyRow {
  occupied_beds: string
  total_beds: string
}

interface OtRow {
  in_progress: string
  completed: string
  total_rooms: string
}

interface CathLabRow {
  active_procedures: string
  cag_count: string
  ptca_count: string
}

function getAverageMinutes(summary: DurationMetricSummary): number {
  if (summary.totalCycles === 0) {
    return 0
  }

  return Number((summary.averageDurationMs / 60000).toFixed(1))
}

function toWorkflowAreaMetrics(
  occupancy: OccupancyRow | undefined,
  tatSummary: DurationMetricSummary,
  cleaningSummary: DurationMetricSummary
) {
  return {
    occupiedBeds: Number(occupancy?.occupied_beds) || 0,
    totalBeds: Number(occupancy?.total_beds) || 0,
    averageTatMinutes: getAverageMinutes(tatSummary),
    tatCycleCount: tatSummary.totalCycles,
    averageCleaningMinutes: getAverageMinutes(cleaningSummary),
    cleaningCycleCount: cleaningSummary.totalCycles,
  }
}

export async function getDepartmentMetrics() {
  try {
    const triageOccupancyQuery = query<OccupancyRow>(`
      SELECT
        COUNT(*) FILTER (WHERE b.is_occupied = true) AS occupied_beds,
        COUNT(*) AS total_beds
      FROM beds b
      JOIN wards w ON w.id = b.ward_id
      WHERE b.is_active = true
        AND w.is_active = true
        AND w.code = 'TRIAGE'
    `)

    const emergencyOccupancyQuery = query<OccupancyRow>(`
      SELECT
        COUNT(*) FILTER (WHERE b.is_occupied = true) AS occupied_beds,
        COUNT(*) AS total_beds
      FROM beds b
      JOIN wards w ON w.id = b.ward_id
      WHERE b.is_active = true
        AND w.is_active = true
        AND w.code = 'ER'
    `)

    const otQuery = query<OtRow>(`
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

    const cathQuery = query<CathLabRow>(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS active_procedures,
        COUNT(*) FILTER (WHERE UPPER(procedure_type) = 'CAG') AS cag_count,
        COUNT(*) FILTER (WHERE UPPER(procedure_type) = 'PTCA') AS ptca_count
      FROM cath_lab_procedures
    `)

    const [
      triageOccupancyRes,
      emergencyOccupancyRes,
      triageTatSummary,
      triageCleaningSummary,
      erTatSummary,
      erCleaningSummary,
      otRes,
      cathRes,
    ] = await Promise.all([
      triageOccupancyQuery,
      emergencyOccupancyQuery,
      getTriageTatSummary(),
      getTriageCleaningTatSummary(),
      getErTatSummary(),
      getErCleaningTatSummary(),
      otQuery,
      cathQuery,
    ])

    const triageMetrics = toWorkflowAreaMetrics(
      triageOccupancyRes.rows[0],
      triageTatSummary,
      triageCleaningSummary
    )
    const emergencyMetrics = toWorkflowAreaMetrics(
      emergencyOccupancyRes.rows[0],
      erTatSummary,
      erCleaningSummary
    )
    const otMetrics = otRes.rows[0] || { in_progress: '0', completed: '0', total_rooms: '0' }
    const utilizationRate = Number(otMetrics.total_rooms) > 0
      ? Math.round((Number(otMetrics.in_progress) / Number(otMetrics.total_rooms)) * 100)
      : 0
    const cathMetrics = cathRes.rows[0] || {
      active_procedures: '0',
      cag_count: '0',
      ptca_count: '0',
    }

    const data: DepartmentMetrics = {
      triage: triageMetrics,
      emergency: emergencyMetrics,
      ot: {
        inProgress: Number(otMetrics.in_progress) || 0,
        completed: Number(otMetrics.completed) || 0,
        utilizationRate,
      },
      cathLab: {
        activeProcedures: Number(cathMetrics.active_procedures) || 0,
        cagCount: Number(cathMetrics.cag_count) || 0,
        ptcaCount: Number(cathMetrics.ptca_count) || 0,
      },
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    logger.error('Failed to get department metrics', error as Error)
    return { success: false, error: 'Database error fetching metrics' }
  }
}
