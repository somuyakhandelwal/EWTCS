'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/shared/lib/db'
import { requireWriteRole } from '@/shared/lib/auth'
import { SYMPTOM_MAX_LENGTH } from '../components/triage-modal.types'

// Store triage info into beds.metadata JSONB
export async function updateBedTriageInfo(
  bedId: string,
  triageData: {
    patientUhid: string
    patientIpdId?: string | null
    patientName: string
    patientAge: number
    patientGender: 'Male' | 'Female' | 'Other' | 'Unknown'
    keySymptom: string
    triageCategory: 'Resuscitation' | 'Emergent' | 'Urgent' | 'Less Urgent' | 'Non-Urgent'
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireWriteRole('beds')
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const normalizedUhid = triageData.patientUhid.trim()
    const normalizedName = triageData.patientName.trim()
    const normalizedIpdId = triageData.patientIpdId?.trim() || null
    const normalizedKeySymptom = triageData.keySymptom.trim()
    const normalizedAge = Math.floor(triageData.patientAge)

    if (!normalizedUhid || !normalizedName) {
      return { success: false, error: 'UHID and patient name are required.' }
    }

    if (!Number.isFinite(normalizedAge) || normalizedAge <= 0 || normalizedAge > 130) {
      return { success: false, error: 'Patient age must be between 1 and 130.' }
    }

    if (normalizedKeySymptom.length > SYMPTOM_MAX_LENGTH) {
      return {
        success: false,
        error: `Symptoms / Complaint must be ${SYMPTOM_MAX_LENGTH} characters or fewer.`,
      }
    }

    const triageInfo = {
      patientUhid: normalizedUhid,
      ...(normalizedIpdId ? { patientIpdId: normalizedIpdId } : {}),
      patientName: normalizedName,
      patientAge: normalizedAge,
      patientGender: triageData.patientGender,
      keySymptom: normalizedKeySymptom,
      triageCategory: triageData.triageCategory,
    }

    const updateResult = await query<{ id: string }>(
      `UPDATE beds
       SET patient_uhid = $1,
           patient_ipd_id = $2,
           patient_name = $3,
           patient_age = $4,
           patient_gender = $5,
           key_symptom = $6,
           triage_category = $7,
           metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{triageInfo}', $8::jsonb, true),
           updated_at = NOW()
       WHERE id = $9
       RETURNING id`,
      [
        normalizedUhid,
        normalizedIpdId,
        normalizedName,
        normalizedAge,
        triageData.patientGender,
        normalizedKeySymptom || null,
        triageData.triageCategory,
        JSON.stringify(triageInfo),
        bedId,
      ]
    )

    if (updateResult.rows.length === 0) {
      return { success: false, error: 'Bed not found' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/supervisor')
    revalidatePath('/admin')
    return { success: true }
  } catch {
    return { success: false, error: 'Internal server error' }
  }
}
