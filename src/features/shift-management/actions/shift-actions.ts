'use server'
// Shift CRUD Server Actions (US-8.1)
// Epic 8: Shift Management

import { query } from '@/shared/lib/db'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import { CreateShiftSchema, UpdateShiftSchema } from '../schemas/shift-schemas'
import { getAllShifts } from '../lib/shift-queries'
import type { Shift } from '../types/shift.types'

export async function getShiftsAction(): Promise<{
  success: boolean
  shifts?: Shift[]
  error?: string
}> {
  try {
    const shifts = await getAllShifts()
    return { success: true, shifts }
  } catch (err) {
    logger.error('getShiftsAction failed', err as Error)
    return { success: false, error: 'Failed to load shifts' }
  }
}

export async function createShift(input: {
  name: string
  start_time: string
  end_time: string
}): Promise<{ success: boolean; shift?: Shift; error?: string }> {
  try {
    const session = await requireRole(['admin'])
    const parsed = CreateShiftSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
      return { success: false, error: firstError ?? 'Validation error' }
    }
    const { name, start_time, end_time } = parsed.data
    const result = await query<Shift>(
      `INSERT INTO shifts (name, start_time, end_time, is_default)
       VALUES ($1, $2::time, $3::time, false)
       RETURNING id, name,
         start_time::text AS start_time, end_time::text AS end_time,
         (start_time > end_time) AS crosses_midnight,
         is_default, is_active,
         created_at::text AS created_at, updated_at::text AS updated_at`,
      [name.trim(), start_time, end_time]
    )
    const shift = result.rows[0]
    await logAudit({ actionType: 'CREATE', entityType: 'shift', entityId: shift.id,
      performedBy: session.userId, changes: { name, start_time, end_time } })
    logger.info('Shift created', { shiftId: shift.id, name, performedBy: session.userId })
    revalidatePath('/admin/shifts')
    return { success: true, shift }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create shift'
    logger.error('createShift failed', err as Error)
    return { success: false, error: message }
  }
}

export async function updateShift(input: {
  id: string; name?: string; start_time?: string; end_time?: string; is_active?: boolean
}): Promise<{ success: boolean; shift?: Shift; error?: string }> {
  try {
    const session = await requireRole(['admin'])
    const parsed = UpdateShiftSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
      return { success: false, error: firstError ?? 'Validation error' }
    }
    const { id, name, start_time, end_time, is_active } = parsed.data
    const result = await query<Shift>(
      `UPDATE shifts
       SET name = COALESCE($1, name), start_time = COALESCE($2::time, start_time),
           end_time = COALESCE($3::time, end_time), is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name,
         start_time::text AS start_time, end_time::text AS end_time,
         (start_time > end_time) AS crosses_midnight,
         is_default, is_active,
         created_at::text AS created_at, updated_at::text AS updated_at`,
      [name?.trim() ?? null, start_time ?? null, end_time ?? null, is_active ?? null, id]
    )
    if (result.rows.length === 0) return { success: false, error: 'Shift not found' }
    const shift = result.rows[0]
    await logAudit({ actionType: 'UPDATE', entityType: 'shift', entityId: id,
      performedBy: session.userId, changes: { name, start_time, end_time, is_active } })
    logger.info('Shift updated', { shiftId: id, performedBy: session.userId })
    revalidatePath('/admin/shifts')
    return { success: true, shift }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update shift'
    logger.error('updateShift failed', err as Error)
    return { success: false, error: message }
  }
}

export async function deleteShift(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(['admin'])
    const result = await query(
      `UPDATE shifts SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND is_default = FALSE RETURNING id`,
      [id]
    )
    if (result.rowCount === 0) return { success: false, error: 'Default shifts cannot be deleted' }
    await logAudit({ actionType: 'DEACTIVATE', entityType: 'shift', entityId: id,
      performedBy: session.userId, changes: {} })
    logger.info('Shift deactivated', { shiftId: id, performedBy: session.userId })
    revalidatePath('/admin/shifts')
    return { success: true }
  } catch (err) {
    logger.error('deleteShift failed', err as Error)
    return { success: false, error: 'Failed to delete shift' }
  }
}
