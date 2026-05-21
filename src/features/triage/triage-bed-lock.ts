import type { PoolClient } from 'pg'
import type { TriageState } from './types'

export type LockedTriageBed = {
  id: string
  bedNumber: string
  state: TriageState
  lastStateChange: Date
}

export async function lockTriageBed(
  client: PoolClient,
  bedId: string
): Promise<LockedTriageBed> {
  const bedResult = await client.query<{ id: string; bedNumber: string; wardCode: string }>(
    `
    SELECT b.id, b.bed_number as "bedNumber", w.code as "wardCode"
    FROM beds b
    JOIN wards w ON w.id = b.ward_id
    WHERE b.id = $1 AND b.is_active = true
    FOR UPDATE OF b
    `,
    [bedId]
  )

  const bed = bedResult.rows[0]
  if (!bed) throw new Error('Bed not found.')
  if (bed.wardCode !== 'TRIAGE') throw new Error('Only triage beds can use triage workflow.')

  const statusResult = await client.query<{
    state: TriageState
    lastStateChange: Date
  }>(
    `SELECT state, last_state_change as "lastStateChange"
     FROM triage_bed_statuses
     WHERE bed_id = $1
     FOR UPDATE`,
    [bedId]
  )

  if (statusResult.rows[0]) {
    return { id: bed.id, bedNumber: bed.bedNumber, ...statusResult.rows[0] }
  }

  const inserted = await client.query<{ state: TriageState; lastStateChange: Date }>(
    `INSERT INTO triage_bed_statuses (bed_id, state)
     VALUES ($1, 'empty')
     RETURNING state, last_state_change as "lastStateChange"`,
    [bedId]
  )
  return { id: bed.id, bedNumber: bed.bedNumber, ...inserted.rows[0] }
}
