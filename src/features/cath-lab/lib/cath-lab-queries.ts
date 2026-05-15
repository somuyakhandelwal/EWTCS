import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { CardiologistOption, CathLabProcedure, CreateCathLabProcedureInput } from '../types/cath-lab'

interface CathLabProcedureRow {
  id: string
  procedure_type: 'CAG' | 'PTCA'
  patient_uhid: string | null
  cardiologist_id: string | null
  cardiologist_username: string | null
  actual_start_time: Date | string | null
  actual_end_time: Date | string | null
  duration_minutes: number | null
  status: CathLabProcedure['status']
  outcome: string | null
  created_at: Date | string
  updated_at: Date | string
}

function toIso(value: Date | string | null): string | null {
  return value ? new Date(value).toISOString() : null
}

export async function getActiveCardiologists(): Promise<CardiologistOption[]> {
  const result = await pool.query<CardiologistOption>(
    `SELECT id, username
     FROM users
     WHERE role = 'cardiologist'
       AND is_active = true
     ORDER BY username ASC`
  )
  return result.rows
}

export async function ensureActiveCardiologist(cardiologistId: string): Promise<boolean> {
  const result = await pool.query<{ id: string }>(
    `SELECT id
     FROM users
     WHERE id = $1
       AND role = 'cardiologist'
       AND is_active = true
     LIMIT 1`,
    [cardiologistId]
  )
  return result.rows.length > 0
}

export async function createCathLabProcedure(
  input: CreateCathLabProcedureInput & { cardiologistId: string },
  createdBy: string
): Promise<CathLabProcedure> {
  const result = await pool.query<CathLabProcedureRow>(
    `WITH inserted AS (
       INSERT INTO cath_lab_procedures (
         procedure_type,
         patient_uhid,
         cardiologist_id,
         actual_start_time,
         actual_end_time,
         duration_minutes,
         outcome,
         clinical_notes,
         status
       )
       VALUES (
         $1, $2, $3, $4, $5,
         GREATEST(0, FLOOR(EXTRACT(EPOCH FROM ($5::timestamptz - $4::timestamptz)) / 60)::integer),
         $6, NULLIF($7, ''), 'COMPLETED'
       )
       RETURNING *
     )
     SELECT inserted.*, u.username AS cardiologist_username
     FROM inserted
     LEFT JOIN users u ON u.id = inserted.cardiologist_id`,
    [
      input.procedureType,
      input.patientUhid,
      input.cardiologistId,
      input.actualStartTime,
      input.actualEndTime,
      input.outcome,
      input.clinicalNotes?.trim() ?? null,
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
    `SELECT p.*, u.username AS cardiologist_username
     FROM cath_lab_procedures p
     LEFT JOIN users u ON u.id = p.cardiologist_id
     ORDER BY COALESCE(p.actual_start_time, p.created_at) DESC
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
    cardiologistName: row.cardiologist_username ?? 'Unassigned',
    actualStartTime: toIso(row.actual_start_time),
    actualEndTime: toIso(row.actual_end_time),
    durationMinutes: row.duration_minutes,
    status: row.status,
    outcome: row.outcome ?? '',
    createdAt: toIso(row.created_at) ?? '',
    updatedAt: toIso(row.updated_at) ?? '',
  }
}
