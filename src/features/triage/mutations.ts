import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { PoolClient } from 'pg'
import type { TriageDecisionOutcome, TriagePatientDetails, TriageState } from './types'
import { validateTriageTransition } from './state'
import { lockTriageBed, type LockedTriageBed } from './triage-bed-lock'
import {
  INSERT_AUDIT_LOG_SQL,
  INSERT_BED_STAGE_LOG_SQL,
} from '@/features/bed-dashboard/lib/bed-mutations.constants'

function durationFrom(startedAt: Date): number {
  return Date.now() - new Date(startedAt).getTime()
}

async function writeTriageLog(
  client: PoolClient,
  bed: LockedTriageBed,
  toState: TriageState,
  userId: string,
  metadata: Record<string, unknown>,
  notes?: string
) {
  await client.query(
    `INSERT INTO triage_state_logs (
       bed_id, from_state, to_state, changed_by_user_id,
       duration_in_previous_state_ms, notes, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [bed.id, bed.state, toState, userId, durationFrom(bed.lastStateChange), notes ?? null, JSON.stringify(metadata)]
  )
}

async function writeAudit(
  client: PoolClient,
  bed: LockedTriageBed,
  toState: TriageState,
  userId: string,
  metadata: Record<string, unknown>
) {
  await client.query(
    `INSERT INTO audit_logs (
       action_type, entity_type, entity_id, performed_by_user_id,
       changes, reason, metadata
     ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb)`,
    [
      'UPDATE',
      'triage_bed',
      bed.id,
      userId,
      JSON.stringify({ fromState: bed.state, toState }),
      'Triage bed state updated',
      JSON.stringify({ ...metadata, bedNumber: bed.bedNumber }),
    ]
  )
}

async function setTriageState(client: PoolClient, bedId: string, toState: TriageState) {
  await client.query(
    `UPDATE triage_bed_statuses
     SET state = $1, last_state_change = NOW(), updated_at = NOW()
     WHERE bed_id = $2`,
    [toState, bedId]
  )
}

async function savePatient(client: PoolClient, bedId: string, patient: TriagePatientDetails) {
  await client.query(
    `UPDATE beds
     SET patient_uhid = $1, patient_ipd_id = $2, patient_name = $3,
         patient_age = $4, patient_gender = $5, key_symptom = $6,
         triage_category = $7, patient_start_time = COALESCE(patient_start_time, NOW()),
         is_occupied = true,
         metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{triageInfo}', $8::jsonb, true),
         updated_at = NOW()
     WHERE id = $9`,
    [
      patient.patientUhid,
      patient.patientIpdId,
      patient.patientName,
      patient.patientAge,
      patient.patientGender,
      patient.keySymptom || null,
      patient.triageCategory,
      JSON.stringify(patient),
      bedId,
    ]
  )
}

async function clearPatient(client: PoolClient, bedId: string) {
  await client.query(
    `UPDATE beds
     SET patient_uhid = NULL, patient_ipd_id = NULL, patient_name = NULL,
         patient_age = NULL, patient_gender = NULL, key_symptom = NULL,
         triage_category = NULL, patient_start_time = NULL, is_occupied = false,
         metadata = COALESCE(metadata, '{}'::jsonb) - 'triageInfo',
         updated_at = NOW()
     WHERE id = $1`,
    [bedId]
  )
}

type TriagePatientSnapshot = {
  patientUhid: string | null
  patientIpdId: string | null
  patientName: string | null
  patientAge: number | null
  patientGender: string | null
  keySymptom: string | null
  triageCategory: string | null
}

async function getTriagePatientSnapshot(client: PoolClient, bedId: string): Promise<TriagePatientSnapshot> {
  const result = await client.query<TriagePatientSnapshot>(
    `SELECT
        patient_uhid as "patientUhid",
        patient_ipd_id as "patientIpdId",
        patient_name as "patientName",
        patient_age as "patientAge",
        patient_gender as "patientGender",
        key_symptom as "keySymptom",
        triage_category as "triageCategory"
     FROM beds
     WHERE id = $1`,
    [bedId]
  )

  if (!result.rows[0]) {
    throw new Error('Triage patient details not found.')
  }

  return result.rows[0]
}

type LockedErBed = {
  id: string
  bedNumber: string
  currentStageId: string | null
  currentStageName: string | null
  lastStageChange: Date | null
  isOccupied: boolean
}

async function lockErBed(client: PoolClient, bedId: string): Promise<LockedErBed> {
  const result = await client.query<LockedErBed>(
    `
    SELECT
      b.id,
      b.bed_number as "bedNumber",
      b.current_stage_id as "currentStageId",
      s.name as "currentStageName",
      b.last_stage_change as "lastStageChange",
      b.is_occupied as "isOccupied"
    FROM beds b
    JOIN wards w ON w.id = b.ward_id AND w.code = 'ER'
    LEFT JOIN stages s ON s.id = b.current_stage_id
    WHERE b.id = $1 AND b.is_active = true
    FOR UPDATE OF b
    `,
    [bedId]
  )

  const bed = result.rows[0]
  if (!bed) throw new Error('ER bed not found or inactive.')
  return bed
}

async function resolveErStartingStage(client: PoolClient): Promise<{ id: string; name: string }> {
  const result = await client.query<{ id: string; name: string }>(
    `
    SELECT id, name
    FROM stages
    WHERE is_active = true AND LOWER(name) = ANY($1)
    ORDER BY CASE LOWER(name)
      WHEN 'registration' THEN 1
      WHEN 'doctor assessment' THEN 2
      WHEN 'treatment/observation' THEN 3
      ELSE 99
    END
    LIMIT 1
    `,
    [[
      'registration',
      'doctor assessment',
      'treatment/observation',
    ]]
  )

  if (!result.rows[0]) {
    throw new Error('ER starting stage not found.')
  }

  return result.rows[0]
}

export async function assignPatientInDB(bedId: string, patient: TriagePatientDetails, userId: string) {
  const metadata = { source: 'triage', assignment: true, triageCategory: patient.triageCategory }
  return runTriageMutation(bedId, 'initial_treatment', userId, metadata, async (client) => {
    await savePatient(client, bedId, patient)
  })
}

export async function updatePatientInDB(bedId: string, patient: TriagePatientDetails, userId: string) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const bed = await lockTriageBed(client, bedId)
    if (bed.state !== 'initial_treatment' && bed.state !== 'decision_made') {
      throw new Error('Triage details can only be edited while treatment or decision is active.')
    }
    await savePatient(client, bedId, patient)
    await writeAudit(client, bed, bed.state, userId, { source: 'triage', patientUpdated: true })
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Failed to update triage patient details', error as Error, { bedId })
    throw error
  } finally {
    client.release()
  }
}

export async function transitionTriageBedInDB(bedId: string, toState: TriageState, userId: string) {
  return runTriageMutation(bedId, toState, userId, { source: 'triage' }, async (client) => {
    if (toState === 'cleaning') await clearPatient(client, bedId)
    if (toState === 'empty') await clearPatient(client, bedId)
  })
}

export async function completeTriageDecisionInDB(params: {
  bedId: string
  outcome: TriageDecisionOutcome
  erBedId?: string | null
  userId: string
}) {
  const client = await pool.connect()
  const { bedId, outcome, erBedId, userId } = params

  try {
    await client.query('BEGIN')

    const bed = await lockTriageBed(client, bedId)
    if (bed.state !== 'decision_made') {
      throw new Error('Decision outcomes can only be recorded for decision made beds.')
    }

    const validation = validateTriageTransition(bed.state, 'cleaning')
    if (validation.success === false) throw new Error(validation.error)

    const patient = await getTriagePatientSnapshot(client, bedId)
    if (!patient.patientUhid && !patient.patientName) {
      throw new Error('Triage patient details are missing; cannot transfer.')
    }

    let erBedNumber: string | null = null
    let erStageId: string | null = null

    if (outcome === 'shift_to_er') {
      if (!erBedId) throw new Error('ER bed selection is required.')

      const erBed = await lockErBed(client, erBedId)
      const stageName = (erBed.currentStageName || '').trim().toLowerCase()
      if (erBed.isOccupied || stageName !== 'empty') {
        throw new Error('Selected ER bed is not available.')
      }

      const erStartStage = await resolveErStartingStage(client)
      erStageId = erStartStage.id
      erBedNumber = erBed.bedNumber

      const triageInfo = {
        patientUhid: patient.patientUhid ?? undefined,
        patientIpdId: patient.patientIpdId ?? undefined,
        patientName: patient.patientName ?? undefined,
        patientAge: patient.patientAge ?? undefined,
        patientGender: patient.patientGender ?? undefined,
        keySymptom: patient.keySymptom ?? undefined,
        triageCategory: patient.triageCategory ?? undefined,
      }

      await client.query(
        `UPDATE beds
         SET patient_uhid = $1,
             patient_ipd_id = $2,
             patient_name = $3,
             patient_age = $4,
             patient_gender = $5,
             key_symptom = $6,
             triage_category = $7,
             patient_start_time = NOW(),
             is_occupied = true,
             current_stage_id = $8,
             last_stage_change = NOW(),
             metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{triageInfo}', $9::jsonb, true),
             updated_at = NOW()
         WHERE id = $10`,
        [
          patient.patientUhid,
          patient.patientIpdId,
          patient.patientName,
          patient.patientAge,
          patient.patientGender,
          patient.keySymptom,
          patient.triageCategory,
          erStartStage.id,
          JSON.stringify(triageInfo),
          erBedId,
        ]
      )

      const durationInPreviousStageMs = erBed.lastStageChange
        ? Date.now() - new Date(erBed.lastStageChange).getTime()
        : null

      await client.query(INSERT_BED_STAGE_LOG_SQL, [
        erBedId,
        erBed.currentStageId,
        erStartStage.id,
        userId,
        durationInPreviousStageMs,
        'Transferred from triage',
        null,
        null,
      ])

      await client.query(INSERT_AUDIT_LOG_SQL, [
        'UPDATE',
        'bed',
        erBedId,
        userId,
        JSON.stringify({
          fromStageId: erBed.currentStageId,
          toStageId: erStartStage.id,
          isOccupied: true,
        }),
        'ER bed assigned from triage',
        JSON.stringify({
          source: 'triage-transfer',
          triageBedId: bedId,
          triageBedNumber: bed.bedNumber,
          decisionOutcome: outcome,
        }),
        null,
      ])
    }

    await clearPatient(client, bedId)
    await setTriageState(client, bedId, 'cleaning')
    await writeTriageLog(client, bed, 'cleaning', userId, {
      source: 'triage',
      decisionOutcome: outcome,
      transferErBedId: erBedId ?? null,
      transferErBedNumber: erBedNumber,
      erStartStageId: erStageId,
    })
    await writeAudit(client, bed, 'cleaning', userId, {
      source: 'triage',
      decisionOutcome: outcome,
      transferErBedId: erBedId ?? null,
      transferErBedNumber: erBedNumber,
      erStartStageId: erStageId,
    })

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Failed to complete triage decision', error as Error, { bedId, outcome })
    throw error
  } finally {
    client.release()
  }
}

async function runTriageMutation(
  bedId: string,
  toState: TriageState,
  userId: string,
  metadata: Record<string, unknown>,
  beforeStateWrite: (client: PoolClient, bed: LockedTriageBed) => Promise<void>
) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const bed = await lockTriageBed(client, bedId)
    const validation = validateTriageTransition(bed.state, toState)
    if (validation.success === false) throw new Error(validation.error)
    await beforeStateWrite(client, bed)
    await setTriageState(client, bedId, toState)
    await writeTriageLog(client, bed, toState, userId, metadata)
    await writeAudit(client, bed, toState, userId, metadata)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Failed to mutate triage bed', error as Error, { bedId, toState })
    throw error
  } finally {
    client.release()
  }
}
