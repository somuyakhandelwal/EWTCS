import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { requireRole } from '@/shared/lib/auth'
import {
  TRIAGE_BED_NUMBERS,
  type TriageBed,
  type TriageCategory,
  type TriageState,
} from './types'

type TriageBedRow = {
  id: string
  bedNumber: string
  state: TriageState
  lastStateChange: Date
  patientStartTime: Date | null
  patientUhid: string | null
  patientIpdId: string | null
  patientName: string | null
  patientAge: number | null
  patientGender: 'Male' | 'Female' | 'Other' | 'Unknown' | null
  keySymptom: string | null
  triageCategory: TriageCategory | null
}

function toTriageBed(row: TriageBedRow): TriageBed {
  const hasPatient = Boolean(row.patientUhid || row.patientName || row.triageCategory)

  return {
    id: row.id,
    bedNumber: row.bedNumber,
    state: row.state,
    lastStateChange: row.lastStateChange,
    patientStartTime: row.patientStartTime,
    patient: hasPatient
      ? {
          patientUhid: row.patientUhid ?? undefined,
          patientIpdId: row.patientIpdId,
          patientName: row.patientName ?? undefined,
          patientAge: row.patientAge ?? undefined,
          patientGender: row.patientGender ?? undefined,
          keySymptom: row.keySymptom ?? '',
          triageCategory: row.triageCategory ?? undefined,
        }
      : null,
  }
}

export async function getTriageDashboardData(): Promise<{
  success: boolean
  data?: { beds: TriageBed[] }
  error?: string
}> {
  try {
    await requireRole(['nurse', 'housekeeping', 'supervisor', 'admin'])

    const result = await query<TriageBedRow>(
      `
      WITH target_beds(bed_number, sort_order) AS (
        SELECT * FROM unnest($1::text[]) WITH ORDINALITY
      )
      SELECT
        b.id,
        b.bed_number as "bedNumber",
        COALESCE(tbs.state, 'empty'::triage_bed_state) as "state",
        COALESCE(tbs.last_state_change, b.last_stage_change, b.created_at) as "lastStateChange",
        b.patient_start_time as "patientStartTime",
        b.patient_uhid as "patientUhid",
        b.patient_ipd_id as "patientIpdId",
        b.patient_name as "patientName",
        b.patient_age as "patientAge",
        b.patient_gender as "patientGender",
        b.key_symptom as "keySymptom",
        b.triage_category as "triageCategory"
      FROM target_beds tb
      JOIN beds b ON b.bed_number = tb.bed_number AND b.is_active = true
      JOIN wards w ON w.id = b.ward_id AND w.code = 'TRIAGE'
      LEFT JOIN triage_bed_statuses tbs ON tbs.bed_id = b.id
      ORDER BY tb.sort_order
      `,
      [TRIAGE_BED_NUMBERS]
    )

    return { success: true, data: { beds: result.rows.map(toTriageBed) } }
  } catch (error) {
    logger.error('Failed to fetch triage dashboard data', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load triage beds',
    }
  }
}
