// Shift Mutations
// EPIC 8: Shift Management (US-8.1)
// Purpose: Create, update, and delete shift rows.

import 'server-only'

import { query } from '@/shared/lib/db'
import type { Shift } from '../types/shift'
import type { CreateShiftInput, UpdateShiftInput } from '../schemas/shift-schemas'

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

export async function createShift(input: CreateShiftInput): Promise<Shift> {
  const result = await query<ShiftRow>(
    `INSERT INTO shifts (name, start_time, end_time)
     VALUES ($1, $2, $3)
     RETURNING id, name, start_time, end_time, is_active, created_at, updated_at`,
    [input.name, input.startTime, input.endTime]
  )
  return rowToShift(result.rows[0])
}

export async function updateShift(input: UpdateShiftInput): Promise<Shift> {
  const result = await query<ShiftRow>(
    `UPDATE shifts
     SET    name       = $2,
            start_time = $3,
            end_time   = $4,
            is_active  = COALESCE($5, is_active),
            updated_at = NOW()
     WHERE  id = $1
     RETURNING id, name, start_time, end_time, is_active, created_at, updated_at`,
    [input.id, input.name, input.startTime, input.endTime, input.isActive ?? null]
  )
  if (result.rows.length === 0) throw new Error('Shift not found')
  return rowToShift(result.rows[0])
}

export async function deleteShift(id: string): Promise<void> {
  await query(`DELETE FROM shifts WHERE id = $1`, [id])
}
