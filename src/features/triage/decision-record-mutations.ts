import type { PoolClient } from 'pg'
import type { TriageDecisionOutcome } from './types'
import type { getTriagePatientSnapshot } from './decision-helpers'

type TriagePatientSnapshot = Awaited<ReturnType<typeof getTriagePatientSnapshot>>

export async function writeDecisionRecord(
  client: PoolClient,
  params: {
    triageBedId: string
    outcome: TriageDecisionOutcome
    erBedId: string | null
    erStartStageId: string | null
    userId: string
    patient: TriagePatientSnapshot
    metadata: Record<string, unknown>
  }
) {
  const { triageBedId, outcome, erBedId, erStartStageId, userId, patient, metadata } = params

  await client.query(
    `INSERT INTO triage_decisions (
       triage_bed_id,
       outcome,
       er_bed_id,
       er_start_stage_id,
       patient_uhid,
       patient_ipd_id,
       patient_name,
       patient_age,
       patient_gender,
       key_symptom,
       triage_category,
       decided_by_user_id,
       metadata
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb
     )`,
    [
      triageBedId,
      outcome,
      erBedId,
      erStartStageId,
      patient.patientUhid,
      patient.patientIpdId,
      patient.patientName,
      patient.patientAge,
      patient.patientGender,
      patient.keySymptom,
      patient.triageCategory,
      userId,
      JSON.stringify(metadata),
    ]
  )
}
