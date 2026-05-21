import type { PoolClient } from 'pg'

type TriagePatientSnapshot = {
  patientUhid: string | null
  patientIpdId: string | null
  patientName: string | null
  patientAge: number | null
  patientGender: string | null
  keySymptom: string | null
  triageCategory: string | null
}

export async function getTriagePatientSnapshot(
  client: PoolClient,
  bedId: string
): Promise<TriagePatientSnapshot> {
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

export async function lockErBed(client: PoolClient, bedId: string): Promise<LockedErBed> {
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

export async function resolveErStartingStage(
  client: PoolClient
): Promise<{ id: string; name: string }> {
  const result = await client.query<{ id: string; name: string }>(
    `
    SELECT id, name
    FROM stages
    WHERE is_active = true AND LOWER(name) = ANY($1)
    ORDER BY CASE LOWER(name)
      WHEN 'initial investigation' THEN 1
      WHEN 'initial treatment' THEN 2
      WHEN 'drugs/test' THEN 3
      ELSE 99
    END
    LIMIT 1
    `,
    [[
      'initial investigation',
      'initial treatment',
      'drugs/test',
    ]]
  )

  if (!result.rows[0]) {
    throw new Error('ER starting stage not found.')
  }

  return result.rows[0]
}
