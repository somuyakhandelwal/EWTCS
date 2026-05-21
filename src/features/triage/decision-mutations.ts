import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { TriageDecisionOutcome } from './types'
import { validateTriageTransition } from './state'
import { lockTriageBed } from './triage-bed-lock'
import {
  getTriagePatientSnapshot,
  lockErBed,
  resolveErStartingStage,
} from './decision-helpers'
import { writeDecisionRecord } from './decision-record-mutations'
import {
  clearPatient,
  setTriageState,
  writeAudit,
  writeTriageLog,
} from './mutations'
import {
  INSERT_AUDIT_LOG_SQL,
  INSERT_BED_STAGE_LOG_SQL,
} from '@/features/bed-dashboard/lib/bed-mutations.constants'

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

    const transferErBedId = outcome === 'shift_to_er' ? erBedId ?? null : null
    let erBedNumber: string | null = null
    let erStageId: string | null = null

    if (outcome === 'shift_to_er') {
      if (!transferErBedId) throw new Error('ER bed selection is required.')

      const erBed = await lockErBed(client, transferErBedId)
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
          transferErBedId,
        ]
      )

      const durationInPreviousStageMs = erBed.lastStageChange
        ? Date.now() - new Date(erBed.lastStageChange).getTime()
        : null

      await client.query(INSERT_BED_STAGE_LOG_SQL, [
        transferErBedId,
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
        transferErBedId,
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

    await writeDecisionRecord(client, {
      triageBedId: bedId,
      outcome,
      erBedId: transferErBedId,
      erStartStageId: erStageId,
      userId,
      patient,
      metadata: {
        source: 'triage',
        triageBedNumber: bed.bedNumber,
        transferErBedNumber: erBedNumber,
      },
    })

    await clearPatient(client, bedId)
    await setTriageState(client, bedId, 'cleaning')
    await writeTriageLog(client, bed, 'cleaning', userId, {
      source: 'triage',
      decisionOutcome: outcome,
      transferErBedId,
      transferErBedNumber: erBedNumber,
      erStartStageId: erStageId,
    })
    await writeAudit(client, bed, 'cleaning', userId, {
      source: 'triage',
      decisionOutcome: outcome,
      transferErBedId,
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
