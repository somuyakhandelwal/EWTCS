'use server'

import { logAudit } from '@/shared/lib/audit'
import { requireRole, requireWriteRole } from '@/shared/lib/auth'
import { CathLabProcedureSchema } from '../schemas/cath-lab-schema'
import { createCathLabProcedure, getRecentCathLabProcedures } from '../lib/cath-lab-queries'
import type { CathLabProcedure, CreateCathLabProcedureInput } from '../types/cath-lab'

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

    const procedure = await createCathLabProcedure(result.data, session.userId)

    await logAudit({
      actionType: 'CREATE_CATH_LAB_PROCEDURE',
      entityType: 'cath_lab_procedure',
      entityId: procedure.id,
      performedBy: session.userId,
      metadata: {
        procedureType: procedure.procedureType,
        patientId: procedure.patientId,
      },
    })

    return {
      success: true,
      data: procedure,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create cath lab procedure',
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load procedures',
    }
  }
}
