// EPIC-DB2: Daily Summary Materialized View Refresh Script
// Refreshes the daily_summaries_mv materialized view.
// Execute via: node scripts/daily-summary-cron.mjs
// Schedule:    Windows Task Scheduler / GitHub Actions / Linux cron

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Load env files (same pattern as run-migrations.js) ──────────────────────
function loadEnv() {
  const dotenv = require('dotenv')
  const nodeEnv = process.env.NODE_ENV || 'development'
  const files = ['.env', `.env.${nodeEnv}`, '.env.local']
  for (const f of files) {
    const full = path.resolve(__dirname, '..', f)
    if (fs.existsSync(full)) dotenv.config({ path: full, override: true })
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  loadEnv()

  const { Client } = require('pg')
  const client = new Client({ connectionString: process.env.DATABASE_URL })

  console.log('[daily-summary] Starting materialized view refresh')

  try {
    await client.connect()

    const cleanupResult = await client.query(
      'DELETE FROM token_blacklist WHERE expires_at < NOW()'
    )
    console.log(
      `[daily-summary] Cleared expired token blacklist rows=${cleanupResult.rowCount ?? 0}`
    )

    // CONCURRENTLY allows reads while refreshing.
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY daily_summaries_mv')

    const countResult = await client.query(
      'SELECT COUNT(*)::int AS total_days FROM daily_summaries_mv'
    )
    const totalDays = countResult.rows[0]?.total_days ?? 0
    console.log(`[daily-summary] ✅ Refreshed daily_summaries_mv (rows=${totalDays})`)
  } catch (err) {
    console.error(`[daily-summary] ❌ Failed: ${err.message}`)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
