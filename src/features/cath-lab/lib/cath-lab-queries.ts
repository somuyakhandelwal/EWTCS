import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { CathLabProcedure, CreateCathLabProcedureInput } from '../types/cath-lab'

interface CathLabProcedureRow {
  id: string
  procedure_type: 'CAG' | 'PTCA'
  patient_id: string
  cardiologist: string
  start_time: string
  end_time: string
  outcome: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export async function createCathLabProcedure(
  input: CreateCathLabProcedureInput,
  createdBy: string
): Promise<CathLabProcedure> {
  const result = await pool.query<CathLabProcedureRow>(
    `INSERT INTO cath_lab_procedures
      (procedure_type, patient_id, cardiologist, start_time, end_time, outcome, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.procedureType,
      input.patientId,
      input.cardiologist,
      input.startTime,
      input.endTime,
      input.outcome,
      createdBy,
    ]
  )

  logger.info('Cath lab procedure created', {
    procedureId: result.rows[0].id,
    procedureType: result.rows[0].procedure_type,
    createdBy,
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
    patientId: row.patient_id,
    cardiologist: row.cardiologist,
    startTime: row.start_time,
    endTime: row.end_time,
    outcome: row.outcome,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
