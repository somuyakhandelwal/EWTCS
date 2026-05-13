import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { CathLabProcedure, CreateCathLabProcedureInput } from '../types/cath-lab'

interface CathLabProcedureRow {
  id: string
  procedure_type: string
  patient_uhid: string | null
  cardiologist_id: string
  actual_start_time: string | null
  actual_end_time: string | null
  outcome: string | null
  created_at: string
  updated_at: string
}

export async function createCathLabProcedure(
  input: CreateCathLabProcedureInput,
  cardiologistId: string
): Promise<CathLabProcedure> {
  const result = await pool.query<CathLabProcedureRow>(
    `INSERT INTO cath_lab_procedures
      (procedure_type, patient_uhid, cardiologist_id, actual_start_time, actual_end_time, outcome, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'SCHEDULED')
     RETURNING *`,
    [
      input.procedureType,
      input.patientUhid || null,
      cardiologistId,
      input.startTime || null,
      input.endTime || null,
      input.outcome || null,
    ]
  )

  logger.info('Cath lab procedure created', {
    procedureId: result.rows[0].id,
    procedureType: result.rows[0].procedure_type,
    cardiologistId,
  })

  return mapRow(result.rows[0])
}

export async function getRecentCathLabProcedures(limit = 50): Promise<CathLabProcedure[]> {
  const result = await pool.query<CathLabProcedureRow>(
    `SELECT *
     FROM cath_lab_procedures
     ORDER BY start_time DESC
     LIMIT $1`,
    [limit]
  )

  return result.rows.map(mapRow)
}

function mapRow(row: CathLabProcedureRow): CathLabProcedure {
  return {
    id: row.id,
    procedureType: row.procedure_type,
    patientUhid: row.patient_uhid,
    cardiologistId: row.cardiologist_id,
    startTime: row.actual_start_time,
    endTime: row.actual_end_time,
    outcome: row.outcome,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
