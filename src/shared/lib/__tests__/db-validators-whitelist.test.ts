import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'url'
import * as path from 'path'
import { ALLOWED_TABLES } from '../db-validators'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('DB6-02 whitelist coverage', () => {
  it('includes all required migration-era feature tables in ALLOWED_TABLES', () => {
    const requiredTables = [
      'ot_rooms',
      'cath_lab_procedures',
      'er_intake',
      'diagnosis',
      'ot_procedures',
      'delay_reason_options',
      'alert_preferences',
      'user_feedback',
      'offline_queue',
      'user_settings',
      'daily_summaries_mv',
    ] as const

    for (const table of requiredTables) {
      expect(ALLOWED_TABLES.has(table)).toBe(true)
    }
  })

  it('documents runtime validation as the primary guard for dynamic SQL table names', async () => {
    const fs = await import('fs')
    const src = fs.readFileSync(
      path.resolve(__dirname, '../db-helpers.ts'),
      'utf-8'
    )

    // Build-time SQL-string extraction is brittle for composed/dynamic query text.
    // Runtime validateTableName() in db-helpers is the authoritative safety check.
    const occurrences = (src.match(/validateTableName\(table\)/g) ?? []).length
    expect(occurrences).toBeGreaterThanOrEqual(4)
  })
})
