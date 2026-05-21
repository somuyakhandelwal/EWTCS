import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { PoolClient } from 'pg'
import type { TriagePatientDetails, TriageState } from './types'
import { validateTriageTransition } from './state'
import { lockTriageBed, type LockedTriageBed } from './triage-bed-lock'

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
