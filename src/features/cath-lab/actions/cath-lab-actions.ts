'use server'

import { logAudit } from '@/shared/lib/audit'
import { requireRole, requireWriteRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import { CathLabProcedureSchema } from '../schemas/cath-lab-schema'
import {
  createCathLabProcedure,
  ensureActiveCardiologist,
  getActiveCardiologists,
  getRecentCathLabProcedures,
} from '../lib/cath-lab-queries'
import type { CardiologistOption, CathLabProcedure, CreateCathLabProcedureInput } from '../types/cath-lab'

const CATH_LAB_ALLOWED_ROLES = ['cardiologist', 'cath_lab_nurse', 'nurse', 'supervisor', 'admin']

export async function createCathLabProcedureAction(input: CreateCathLabProcedureInput): Promise<{
  success: boolean
  data?: CathLabProcedure
  error?: string
  errors?: Record<string, string[]>
}> {
  try {
    const session = await requireWriteRole(CATH_LAB_ALLOWED_ROLES, {
      actionType: 'CREATE',
      entityType: 'cath_lab_procedure',
    })

    const result = CathLabProcedureSchema.safeParse(input)
    if (!result.success) {
      return {
        success: false,
        errors: result.error.flatten().fieldErrors,
      }
    }

    const cardiologistId = session.role === 'cardiologist'
      ? session.userId
      : result.data.cardiologistId

    if (!cardiologistId) {
      return { success: false, error: 'Select a cardiologist before saving the procedure log' }
    }

    if (!(await ensureActiveCardiologist(cardiologistId))) {
      return { success: false, error: 'Selected cardiologist is not active or does not exist' }
    }

    const procedure = await createCathLabProcedure(
      { ...result.data, cardiologistId },
      session.userId
    )

    await logAudit({
      actionType: 'CREATE_CATH_LAB_PROCEDURE',
      entityType: 'cath_lab_procedure',
      entityId: procedure.id,
      performedBy: session.userId,
      metadata: {
        procedureType: procedure.procedureType,
        patientUhid: procedure.patientUhid,
        cardiologistId: procedure.cardiologistId,
      },
    })

    return {
      success: true,
      data: procedure,
    }
  } catch (error) {
    logger.error('Failed to create cath lab procedure', error as Error)
    return {
      success: false,
      error: 'Failed to save cath lab procedure. Check that migrations are up to date and try again.',
    }
  }
}

export async function getRecentCathLabProceduresAction(limit = 50): Promise<{
  success: boolean
  data?: CathLabProcedure[]
  error?: string
}> {
  try {
    await requireRole(CATH_LAB_ALLOWED_ROLES)
    const procedures = await getRecentCathLabProcedures(limit)
    return { success: true, data: procedures }
  } catch (error) {
    logger.error('Failed to load cath lab procedures', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load procedures',
    }
  }
}

export async function getActiveCardiologistsAction(): Promise<{
  success: boolean
  data?: CardiologistOption[]
  error?: string
}> {
  try {
    await requireRole(CATH_LAB_ALLOWED_ROLES)
    const cardiologists = await getActiveCardiologists()
    return { success: true, data: cardiologists }
  } catch (error) {
    logger.error('Failed to load active cardiologists', error as Error)
    return { success: false, error: 'Failed to load active cardiologists' }
  }
}
