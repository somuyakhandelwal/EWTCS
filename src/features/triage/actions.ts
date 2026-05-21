'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/shared/lib/auth'
import {
  assignTriagePatientSchema,
  normalizePatientDetails,
  transitionTriageBedSchema,
  updateTriageDetailsSchema,
  type AssignTriagePatientInput,
  type TransitionTriageBedInput,
  type UpdateTriageDetailsInput,
} from './schemas'
import {
  assignPatientInDB,
  transitionTriageBedInDB,
  updatePatientInDB,
} from './mutations'

type ActionResult = { success: boolean; error?: string; errors?: Record<string, string[]> }

function flattenErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return error.flatten().fieldErrors
}

function canPerformClinicalAction(role: string) {
  return role === 'nurse' || role === 'supervisor' || role === 'admin'
}

export async function assignTriagePatient(input: AssignTriagePatientInput): Promise<ActionResult> {
  try {
    const session = await requireRole(['nurse', 'supervisor', 'admin'])
    const parsed = assignTriagePatientSchema.safeParse(input)
    if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) }

    await assignPatientInDB(
      parsed.data.bedId,
      normalizePatientDetails(parsed.data.patient),
      session.userId
    )
    revalidatePath('/triage')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Assignment failed' }
  }
}

export async function updateTriagePatientDetails(
  input: UpdateTriageDetailsInput
): Promise<ActionResult> {
  try {
    const session = await requireRole(['nurse', 'supervisor', 'admin'])
    const parsed = updateTriageDetailsSchema.safeParse(input)
    if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) }

    await updatePatientInDB(
      parsed.data.bedId,
      normalizePatientDetails(parsed.data.patient),
      session.userId
    )
    revalidatePath('/triage')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Update failed' }
  }
}

export async function transitionTriageBed(input: TransitionTriageBedInput): Promise<ActionResult> {
  try {
    const session = await requireRole(['nurse', 'housekeeping', 'supervisor', 'admin'])
    const parsed = transitionTriageBedSchema.safeParse(input)
    if (!parsed.success) return { success: false, errors: flattenErrors(parsed.error) }

    const isCleaningComplete = parsed.data.toState === 'empty'
    if (!canPerformClinicalAction(session.role) && !isCleaningComplete) {
      return { success: false, error: 'Housekeeping can only complete cleaning.' }
    }

    await transitionTriageBedInDB(parsed.data.bedId, parsed.data.toState, session.userId)
    revalidatePath('/triage')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'State update failed' }
  }
}
