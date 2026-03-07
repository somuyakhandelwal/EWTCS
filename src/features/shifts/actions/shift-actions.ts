// Shift Server Actions
// EPIC 8: Shift Management (US-8.1, US-8.3, US-8.4)
// Purpose: CRUD for shifts (admin) + shift performance metrics (supervisor/admin).

'use server'

import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import { getShifts, getShiftPerformance } from '../lib/shift-queries'
import { createShift, updateShift, deleteShift } from '../lib/shift-mutations'
import {
  createShiftSchema,
  updateShiftSchema,
  deleteShiftSchema,
} from '../schemas/shift-schemas'
import type { CreateShiftInput, UpdateShiftInput, DeleteShiftInput } from '../schemas/shift-schemas'
import type { Shift, ShiftPerformance } from '../types/shift'

export async function getShiftsAction(): Promise<{
  success: boolean
  shifts?: Shift[]
  error?: string
}> {
  try {
    await requireRole(['admin', 'supervisor'])
    const shifts = await getShifts()
    return { success: true, shifts }
  } catch (error) {
    logger.error('Failed to fetch shifts', error as Error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch shifts' }
  }
}

export async function createShiftAction(rawInput: CreateShiftInput): Promise<{
  success: boolean
  shift?: Shift
  error?: string
}> {
  try {
    const session = await requireRole(['admin'])
    const parsed = createShiftSchema.safeParse(rawInput)
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? 'Invalid input'
      return { success: false, error: first }
    }
    const shift = await createShift(parsed.data)
    await logAudit({ actionType: 'CREATE', entityType: 'shift', entityId: shift.id, performedBy: session.userId, changes: parsed.data })
    logger.info('Shift created', { shiftId: shift.id, name: shift.name })
    return { success: true, shift }
  } catch (error) {
    logger.error('Failed to create shift', error as Error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create shift' }
  }
}

export async function updateShiftAction(rawInput: UpdateShiftInput): Promise<{
  success: boolean
  shift?: Shift
  error?: string
}> {
  try {
    const session = await requireRole(['admin'])
    const parsed = updateShiftSchema.safeParse(rawInput)
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? 'Invalid input'
      return { success: false, error: first }
    }
    const shift = await updateShift(parsed.data)
    await logAudit({ actionType: 'UPDATE', entityType: 'shift', entityId: shift.id, performedBy: session.userId, changes: parsed.data })
    logger.info('Shift updated', { shiftId: shift.id })
    return { success: true, shift }
  } catch (error) {
    logger.error('Failed to update shift', error as Error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update shift' }
  }
}

export async function deleteShiftAction(rawInput: DeleteShiftInput): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const session = await requireRole(['admin'])
    const parsed = deleteShiftSchema.safeParse(rawInput)
    if (!parsed.success) return { success: false, error: 'Invalid shift ID' }
    await deleteShift(parsed.data.id)
    await logAudit({ actionType: 'DELETE', entityType: 'shift', entityId: parsed.data.id, performedBy: session.userId, changes: {} })
    logger.info('Shift deleted', { shiftId: parsed.data.id })
    return { success: true }
  } catch (error) {
    logger.error('Failed to delete shift', error as Error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete shift' }
  }
}

export async function getShiftPerformanceAction(params: {
  startDate: string
  endDate: string
}): Promise<{
  success: boolean
  performance?: ShiftPerformance[]
  error?: string
}> {
  try {
    await requireRole(['admin', 'supervisor'])
    const start = new Date(params.startDate)
    const end = new Date(params.endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: 'Invalid date range' }
    }
    const performance = await getShiftPerformance(start, end)
    return { success: true, performance }
  } catch (error) {
    logger.error('Failed to fetch shift performance', error as Error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch shift performance' }
  }
}
