import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'
import { describe, expect, it } from 'vitest'

type StageRow = { id: string }
type WardRow = { id: string; name: string }
type UserRow = { id: string }
type BedRow = { id: string; current_stage_id: string | null }

function resolveLiveDatabaseUrl(): string | null {
  const envLocalPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envLocalPath)) {
    const contents = fs.readFileSync(envLocalPath, 'utf8')
    const line = contents
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith('DATABASE_URL='))

    if (line) {
      const raw = line.split('=').slice(1).join('=').trim()
      if (raw.length > 0) return raw.replace(/^['\"]|['\"]$/g, '')
    }
  }

  const fallback = process.env.DATABASE_URL
  // Vitest default test DB often does not exist in local development.
  if (!fallback || fallback.includes('postgresql://test:test@localhost/testdb')) {
    return null
  }
  return fallback
}

const liveDatabaseUrl = resolveLiveDatabaseUrl()
const describeWithDb = liveDatabaseUrl ? describe : describe.skip

describeWithDb('DB2-03 current stage trigger backstop', () => {
  it('is attached only to bed_stage_logs and not to bed_stage_logs_archive', async () => {
    const client = new Client({ connectionString: liveDatabaseUrl! })
    await client.connect()

    try {
      const triggerRows = await client.query<{ table_name: string }>(
        `SELECT c.relname AS table_name
         FROM pg_trigger t
         JOIN pg_class c ON c.oid = t.tgrelid
         JOIN pg_proc p ON p.oid = t.tgfoid
         WHERE NOT t.tgisinternal
           AND p.proname = 'sync_beds_current_stage_from_stage_logs'
         ORDER BY c.relname`
      )

      const attachedTables = triggerRows.rows.map((row) => row.table_name)
      expect(attachedTables).toContain('bed_stage_logs')
      expect(attachedTables).not.toContain('bed_stage_logs_archive')
    } finally {
      await client.end()
    }
  })

  it('updates beds.current_stage_id after direct bed_stage_logs insert', async () => {
    const client = new Client({ connectionString: liveDatabaseUrl! })
    await client.connect()

    try {
      await client.query('BEGIN')

      const stageResult = await client.query<StageRow>(
        `SELECT id
         FROM stages
         WHERE is_active = true
         ORDER BY display_order
         LIMIT 2`
      )

      expect(stageResult.rows.length).toBeGreaterThanOrEqual(2)

      const fromStageId = stageResult.rows[0].id
      const toStageId = stageResult.rows[1].id

      const wardResult = await client.query<WardRow>(
        `SELECT id, name
         FROM wards
         WHERE is_active = true
         ORDER BY created_at ASC
         LIMIT 1`
      )

      const ward = wardResult.rows[0] ?? null
      const username = `trg_user_${Date.now()}_${Math.floor(Math.random() * 10000)}`.slice(0, 49)

      const userResult = await client.query<UserRow>(
        `INSERT INTO users (username, password_hash, role, ward_id)
         VALUES ($1, $2, 'nurse', $3)
         RETURNING id`,
        [username, 'trigger-test-password-hash', ward?.id ?? null]
      )

      const userId = userResult.rows[0].id
      const bedNumber = `TRG-${Date.now()}-${Math.floor(Math.random() * 1000)}`.slice(0, 49)

      const bedInsert = await client.query<BedRow>(
        `INSERT INTO beds (
           bed_number,
           current_stage_id,
           last_stage_change,
           is_occupied,
           ward_id,
           ward_name
         ) VALUES ($1, $2, NOW(), true, $3, $4)
         RETURNING id, current_stage_id`,
        [bedNumber, fromStageId, ward?.id ?? null, ward?.name ?? null]
      )

      const bedId = bedInsert.rows[0].id

      await client.query(
        `INSERT INTO bed_stage_logs (
           bed_id,
           from_stage_id,
           to_stage_id,
           changed_by_user_id,
           transition_time,
           notes
         ) VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [bedId, fromStageId, toStageId, userId, 'DB2-03 trigger verification']
      )

      const bedAfterLogInsert = await client.query<BedRow>(
        `SELECT id, current_stage_id
         FROM beds
         WHERE id = $1`,
        [bedId]
      )

      expect(bedAfterLogInsert.rows[0].current_stage_id).toBe(toStageId)
    } finally {
      await client.query('ROLLBACK')
      await client.end()
    }
  })
})
