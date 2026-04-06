// Discharge Database Queries
// US-2.3: Reset Bed on Patient Discharge
// US-8.2: Auto-tag discharge log entries with the active shift
// Extracted from discharge-actions.ts to stay under the 200-line file limit.

import type { PoolClient } from 'pg'
import { SHIFT_AUTOTAG_SUBQUERY } from '@/shared/lib/shift-helpers'

export interface BedDischargeRow {
  id: string
  currentStageId: string | null
  currentStageName: string | null
  patientStartTime: Date | null
  lastStageChange: Date | null
  isOccupied: boolean
}

export interface DischargeStages {
  dischargeStage: { id: string; name: string }
  cleaningStage: { id: string; name: string }
}

/** Lock and fetch the bed row needed for the discharge transaction. */
export async function fetchBedForDischarge(
  client: PoolClient,
  bedId: string
): Promise<BedDischargeRow | null> {
  const result = await client.query<BedDischargeRow>(
    `SELECT
       b.id,
       b.current_stage_id   AS "currentStageId",
       s.name               AS "currentStageName",
       b.patient_start_time AS "patientStartTime",
       b.last_stage_change  AS "lastStageChange",
       b.is_occupied        AS "isOccupied"
     FROM beds b
     LEFT JOIN stages s ON b.current_stage_id = s.id
     WHERE b.id = $1 AND b.is_active = true
     FOR UPDATE OF b`,
    [bedId]
  )
  return result.rows[0] ?? null
}

/** Fetch the Discharge Process and Cleaning stage IDs. */
export async function fetchDischargeStages(
  client: PoolClient
): Promise<DischargeStages | null> {
  const result = await client.query<{ id: string; name: string }>(
    `SELECT id, name
     FROM stages
     WHERE name IN ('Discharge Process', 'Cleaning') AND is_active = true`
  )
  const dischargeStage = result.rows.find((s) => s.name === 'Discharge Process')
  const cleaningStage = result.rows.find((s) => s.name === 'Cleaning')
  if (!dischargeStage || !cleaningStage) return null
  return { dischargeStage, cleaningStage }
}

/** Write two bed_stage_log entries: current→Discharge and Discharge→Cleaning. */
export async function insertDischargeLogs(
  client: PoolClient,
  params: {
    bedId: string
    bed: BedDischargeRow
    dischargeStageId: string
    cleaningStageId: string
    changedByUserId: string
    notes: string | null
    now: Date
  }
): Promise<void> {
  const { bedId, bed, dischargeStageId, cleaningStageId, changedByUserId, notes, now } = params

  if (bed.currentStageId !== dischargeStageId) {
    const durationInPreviousStageMs = bed.lastStageChange
      ? now.getTime() - new Date(bed.lastStageChange).getTime()
      : null
    await client.query(
      `INSERT INTO bed_stage_logs
         (bed_id, from_stage_id, to_stage_id, changed_by_user_id,
          duration_in_previous_stage_ms, notes, shift_id)
       VALUES ($1, $2, $3, $4, $5, $6, ${SHIFT_AUTOTAG_SUBQUERY})`,
      [bedId, bed.currentStageId, dischargeStageId, changedByUserId, durationInPreviousStageMs, notes]
    )
  }

  await client.query(
    `INSERT INTO bed_stage_logs
       (bed_id, from_stage_id, to_stage_id, changed_by_user_id,
        duration_in_previous_stage_ms, notes, shift_id)
     VALUES ($1, $2, $3, $4, $5, $6, ${SHIFT_AUTOTAG_SUBQUERY})`,
    [bedId, dischargeStageId, cleaningStageId, changedByUserId, 0, 'Auto-advanced to Cleaning on patient discharge']
  )
}

/** Archive the patient stay and reset the bed to Cleaning. */
export async function archiveAndResetBed(
  client: PoolClient,
  params: {
    bedId: string
    admittedAt: Date
    now: Date
    totalDurationMs: number
    cleaningStageId: string
    userId: string
    notes: string | null
  }
): Promise<string | null> {
  const { bedId, admittedAt, now, totalDurationMs, cleaningStageId, userId, notes } = params

  const prevDischarge = await client.query<{ discharged_at: Date }>(
    `SELECT discharged_at
     FROM patient_admissions
     WHERE bed_id = $1
     ORDER BY discharged_at DESC
     LIMIT 1`,
    [bedId]
  )
  const tatFromPreviousDischargeMs = prevDischarge.rows[0]
    ? admittedAt.getTime() - new Date(prevDischarge.rows[0].discharged_at).getTime()
    : null

  const admissionResult = await client.query<{ id: string }>(
    `INSERT INTO patient_admissions
       (bed_id, admitted_at, discharged_at, total_duration_ms, discharged_by_user_id,
        notes, tat_from_previous_discharge_ms, shift_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, ${SHIFT_AUTOTAG_SUBQUERY})
     RETURNING id`,
    [bedId, admittedAt, now, totalDurationMs, userId, notes, tatFromPreviousDischargeMs]
  )

  await client.query(
    `UPDATE beds
     SET current_stage_id  = $1,
         is_occupied        = false,
         patient_start_time = NULL,
         patient_uhid       = NULL,
         patient_ipd_id     = NULL,
         patient_name       = NULL,
         patient_age        = NULL,
         patient_gender     = NULL,
         key_symptom        = NULL,
         triage_category    = NULL,
         last_stage_change  = NOW(),
         metadata           = metadata - 'triageInfo',
         updated_at         = NOW()
     WHERE id = $2`,
    [cleaningStageId, bedId]
  )

  await client.query(
    `UPDATE disposition_delay_reasons
     SET resolved_at = NOW()
     WHERE bed_id = $1 AND resolved_at IS NULL`,
    [bedId]
  )

  return admissionResult.rows[0]?.id ?? null
}