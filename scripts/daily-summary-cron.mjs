// EPIC 9: Daily AI Summary — Standalone Cron Script
// Runs the daily aggregation directly against the database.
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** YYYY-MM-DD for yesterday in UTC */
function yesterdayUtc() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** ms → rounded minutes */
function msToMin(ms) {
  return Math.round((ms / 60000) * 100) / 100
}

// ─── Aggregation (mirrors daily-aggregation-queries.ts in plain JS) ───────────
async function aggregate(client, dateStr) {
  const start = new Date(`${dateStr}T00:00:00.000Z`)
  const end   = new Date(`${dateStr}T23:59:59.999Z`)

  const [patients, stageTime, delays, tat, delayedStage] = await Promise.all([
    client.query(
      `SELECT
         COUNT(DISTINCT pa.id)    AS total,
         COUNT(DISTINCT bsl.bed_id) AS bedsused,
         COUNT(bsl.id)              AS updates
       FROM bed_stage_logs bsl
       LEFT JOIN patient_admissions pa
         ON pa.bed_id = bsl.bed_id
         AND pa.admitted_at BETWEEN $1 AND $2
       WHERE bsl.transition_time BETWEEN $1 AND $2`, [start, end]
    ),
    client.query(
      `SELECT AVG(duration_in_previous_stage_ms) AS avg
       FROM bed_stage_logs
       WHERE transition_time BETWEEN $1 AND $2
         AND duration_in_previous_stage_ms IS NOT NULL`, [start, end]
    ),
    client.query(
      `SELECT COUNT(DISTINCT bed_id) AS cnt
       FROM disposition_delay_reasons
       WHERE recorded_at BETWEEN $1 AND $2`, [start, end]
    ),
    client.query(
      `SELECT AVG(tat_from_previous_discharge_ms) AS avg
       FROM patient_admissions
       WHERE admitted_at BETWEEN $1 AND $2
         AND tat_from_previous_discharge_ms IS NOT NULL`, [start, end]
    ),
    client.query(
      `SELECT s.name
       FROM disposition_delay_reasons ddr
       JOIN bed_stage_logs bsl ON bsl.id = ddr.bed_stage_log_id
       JOIN stages s ON s.id = bsl.to_stage_id
       WHERE ddr.recorded_at BETWEEN $1 AND $2
       GROUP BY s.name ORDER BY COUNT(*) DESC LIMIT 1`, [start, end]
    ),
  ])

  return {
    totalPatients:        parseInt(patients.rows[0]?.total ?? '0', 10),
    totalBedsUsed:        parseInt(patients.rows[0]?.bedsused ?? '0', 10),
    totalStageUpdates:    parseInt(patients.rows[0]?.updates ?? '0', 10),
    avgStageTimeMinutes:  msToMin(parseFloat(stageTime.rows[0]?.avg ?? '0')),
    delayCount:           parseInt(delays.rows[0]?.cnt ?? '0', 10),
    avgTatMinutes:        msToMin(parseFloat(tat.rows[0]?.avg ?? '0')),
    mostDelayedStage:     delayedStage.rows[0]?.name ?? null,
  }
}

// ─── Upsert ───────────────────────────────────────────────────────────────────
async function upsert(client, dateStr, stats) {
  const metadata = stats.mostDelayedStage
    ? JSON.stringify({ mostDelayedStage: stats.mostDelayedStage })
    : '{}'

  const { rows } = await client.query(
    `INSERT INTO daily_summaries
       (summary_date, total_patients, avg_stage_time_minutes, delay_count,
        avg_tat_minutes, total_beds_used, total_stage_updates, generated_at, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8)
     ON CONFLICT (summary_date) DO UPDATE SET
       total_patients        = EXCLUDED.total_patients,
       avg_stage_time_minutes = EXCLUDED.avg_stage_time_minutes,
       delay_count           = EXCLUDED.delay_count,
       avg_tat_minutes       = EXCLUDED.avg_tat_minutes,
       total_beds_used       = EXCLUDED.total_beds_used,
       total_stage_updates   = EXCLUDED.total_stage_updates,
       generated_at          = NOW(),
       metadata              = EXCLUDED.metadata
     RETURNING id, summary_date`,
    [dateStr, stats.totalPatients, stats.avgStageTimeMinutes, stats.delayCount,
     stats.avgTatMinutes, stats.totalBedsUsed, stats.totalStageUpdates, metadata]
  )
  return rows[0]
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  loadEnv()
  const dateStr = process.argv[2] || yesterdayUtc()

  const { Client } = require('pg')
  const client = new Client({ connectionString: process.env.DATABASE_URL })

  console.log(`[daily-summary] Starting aggregation for ${dateStr}`)

  try {
    await client.connect()
    const stats = await aggregate(client, dateStr)
    const saved = await upsert(client, dateStr, stats)

    console.log(`[daily-summary] ✅ Done — id=${saved.id} date=${saved.summary_date}`)
    console.log(`[daily-summary]    patients=${stats.totalPatients}  delays=${stats.delayCount}  avgTAT=${stats.avgTatMinutes}min`)
  } catch (err) {
    console.error(`[daily-summary] ❌ Failed: ${err.message}`)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
