'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/shared/lib/db'
import { requireRole } from '@/shared/lib/auth'
import { verifyActiveSession } from '@/shared/lib/active-session'
import { logger } from '@/shared/config/logger'
import { logAudit } from '@/shared/lib/audit'
import { diagnosisSchema } from '../schemas/diagnosis-schemas'
import type { DiagnosisFormData } from '../schemas/diagnosis-schemas'
import type { DiagnosisRecord, DiagnosisActionResult } from '../types/diagnosis.types'

/**
 * EPIC 22 — US-22.1
 * Submit a new diagnosis record for a bed. Doctor role only.
 *
 * @param bedId - The UUID of the bed being updated with a diagnosis
 * @param formData - The validated diagnosis data from the client form
 * @returns A promise resolving to an object containing success status and the new diagnosis ID or an error message
 */
export async function submitDiagnosis(
  bedId: string,
  formData: DiagnosisFormData,
): Promise<DiagnosisActionResult> {
  try {
    // Enforce doctor-only access
    const session = await requireRole('doctor')

    // Validate input with Zod
    const parseResult = diagnosisSchema.safeParse(formData)
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message ?? 'Invalid input'
      return { success: false, error: firstError }
    }

    const data = parseResult.data

    const insertResult = await query<{ id: string }>(
      `INSERT INTO diagnosis (
         bed_id, patient_uhid, doctor_id,
         symptoms_observed, diagnosis_text, diagnosis_code,
         severity, recommended_action, diagnosed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [
        bedId,
        data.patientUhid,
        session.userId,
        data.symptomsObserved || null,
        data.diagnosisText,
        data.diagnosisCode || null,
        data.severity,
        data.recommendedAction || null,
      ],
    )

    const diagnosisId = insertResult.rows[0]?.id
    if (!diagnosisId) {
      return { success: false, error: 'Failed to save diagnosis' }
    }

    // Audit trail — non-blocking; we still fail gracefully
    try {
      await logAudit({
        actionType: 'DIAGNOSIS_SUBMITTED',
        entityType: 'diagnosis',
        entityId: diagnosisId,
        performedBy: session.userId,
        changes: {
          bedId,
          severity: data.severity,
          diagnosisCode: data.diagnosisCode || null,
        },
        metadata: { patientUhid: data.patientUhid },
      })
    } catch {
      // Audit failure must not block the clinical record
    }

    revalidatePath('/dashboard')
    revalidatePath('/triage')
    revalidatePath('/supervisor')

    return { success: true, diagnosisId }
  } catch (err) {
    logger.error('submitDiagnosis database error', err as Error)
    const message = err instanceof Error ? err.message : 'Internal server error'
    if (message.startsWith('Unauthorized') || message.startsWith('Forbidden')) {
      return { success: false, error: message }
    }
    return { success: false, error: `Failed to save: ${message}` }
  }
}

/**
 * EPIC 22 — US-22.1 (read side)
 * Fetch the most recent diagnosis for a bed.
 * Accessible to all authenticated roles (nurse, supervisor, admin, auditor, doctor).
 *
 * @param bedId - The UUID of the bed to retrieve the diagnosis for
 * @returns A promise resolving to the most recent DiagnosisRecord or null if not found
 */
export async function getDiagnosisForBed(
  bedId: string,
): Promise<DiagnosisRecord | null> {
  try {
    const session = await verifyActiveSession()
    if (!session) return null

    const result = await query<DiagnosisRecord>(
      `SELECT d.*,
              u.username AS doctor_username
         FROM diagnosis d
         LEFT JOIN users u ON d.doctor_id = u.id
        WHERE d.bed_id = $1
        ORDER BY d.diagnosed_at DESC
        LIMIT 1`,
      [bedId],
    )

    return result.rows[0] ?? null
  } catch {
    return null
  }
}
