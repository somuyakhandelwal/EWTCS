// US-13.4: Database Backup Restore Verification Script
// Decrypts (if .enc) + decompresses a backup → restores into a temp PostgreSQL
// database → validates key table row counts → unconditionally drops the temp DB.
// Usage:   node scripts/db-backup-verify.mjs [path-to-backup-file]
//          Omit path to auto-select the latest backup from BACKUP_PATH.
// Schedule: server crontab monthly (see: npm run backup:setup)
// Note:     The connected database user must have CREATE DATABASE privileges.

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { gunzipSync } from 'zlib'
import { createDecipheriv, scryptSync } from 'crypto'
import { spawnSync } from 'child_process'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ─── Load env (same pattern as other cron scripts) ────────────────────────────
function loadEnv() {
  const dotenv = require('dotenv')
  const nodeEnv = process.env.NODE_ENV || 'development'
  for (const f of ['.env', `.env.${nodeEnv}`, '.env.local']) {
    const full = path.resolve(ROOT, f)
    if (fs.existsSync(full)) dotenv.config({ path: full, override: true })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseDbUrl(url) {
  const u = new URL(url)
  return {
    host:     u.hostname || 'localhost',
    port:     u.port     || '5432',
    user:     decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
  }
}

function decryptAndDecompress(filePath, encKey) {
  const raw = fs.readFileSync(filePath)
  let compressed
  if (encKey) {
    // First 16 bytes are the IV written by db-backup.mjs
    const iv        = raw.slice(0, 16)
    const encrypted = raw.slice(16)
    const key       = scryptSync(encKey, 'EWTCS_SALT_2026', 32)
    const decipher  = createDecipheriv('aes-256-cbc', key, iv)
    compressed = Buffer.concat([decipher.update(encrypted), decipher.final()])
  } else {
    compressed = raw
  }
  return gunzipSync(compressed)
}

function psql(args, { pgEnv, input } = {}) {
  return spawnSync('psql', args, {
    env:   pgEnv,
    input: input ?? undefined,
    stdio: input != null ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
  })
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  loadEnv()
  const { log } = require('./lib-logger')
  const { resolveDatabaseUrl } = require('./lib-env')

  log.header('═══ EWTCS Backup Restore Verification (US-13.4) ═══')

  // ── 0. Resolve backup file — explicit arg or auto-find latest from BACKUP_PATH
  let backupFile = process.argv[2]
  if (!backupFile) {
    const backupDir = path.resolve(process.env.BACKUP_PATH || path.join(ROOT, 'backups'))
    const files = fs.existsSync(backupDir)
      ? fs.readdirSync(backupDir)
          .filter(f => f.startsWith('ewtcs_backup_'))
          .map(f => ({ f, t: fs.statSync(path.join(backupDir, f)).mtimeMs }))
          .sort((a, b) => b.t - a.t)
      : []
    if (!files.length) {
      log.error(`No backup files found in ${backupDir}. Run: npm run backup:run`)
      process.exit(1)
    }
    backupFile = path.join(backupDir, files[0].f)
    log.info(`Auto-selected latest backup: ${files[0].f}`)
  }
  if (!fs.existsSync(backupFile)) {
    log.error(`Backup file not found: ${backupFile}`)
    process.exit(1)
  }

  const isEncrypted = backupFile.endsWith('.enc')
  const encKey      = process.env.ENCRYPTION_KEY || ''

  if (isEncrypted && !encKey) {
    log.error('Backup file is encrypted (.enc) but ENCRYPTION_KEY is not set')
    process.exit(1)
  }

  log.step(1, `Backup file: ${path.basename(backupFile)} (encrypted: ${isEncrypted})`)

  // ── 1. Resolve database connection ───────────────────────────────────────
  log.step(2, 'Resolving database connection…')
  let dbUrl
  try { dbUrl = resolveDatabaseUrl() }
  catch (err) { log.error(err.message); process.exit(1) }

  const db     = parseDbUrl(dbUrl)
  const pgEnv  = { ...process.env, PGPASSWORD: db.password }
  const baseArgs = ['-h', db.host, '-p', db.port, '-U', db.user, '--no-password']

  // ── 2. Decrypt and decompress backup into memory ──────────────────────────
  log.step(3, 'Decrypting and decompressing backup…')
  let sqlData
  try {
    sqlData = decryptAndDecompress(backupFile, isEncrypted ? encKey : null)
    log.success(`Decompressed SQL size: ${Math.round(sqlData.length / 1024)} KB`)
  } catch (err) {
    log.error(`Decrypt/decompress failed: ${err.message}`)
    process.exit(1)
  }

  // ── 3. Create temp database, restore, validate, then always drop ──────────
  const tempDb = `ewtcs_restore_test_${Date.now()}`
  log.step(4, `Creating temp database: ${tempDb}`)

  let verificationPassed = false
  try {
    // Create temp DB (connect to 'postgres' default database)
    const create = psql([...baseArgs, '-d', 'postgres', '-c', `CREATE DATABASE ${tempDb};`], { pgEnv })
    if (create.status !== 0) {
      throw new Error(`CREATE DATABASE failed: ${create.stderr?.toString().trim()}`)
    }
    log.success('Temp database created')

    // Pipe decompressed SQL into psql
    log.step(5, 'Restoring backup into temp database…')
    const restore = psql([...baseArgs, '-d', tempDb], { pgEnv, input: sqlData })
    if (restore.status !== 0) {
      throw new Error(`Restore failed: ${restore.stderr?.toString().slice(0, 400)}`)
    }
    log.success('Restore complete')

    // Validate key tables contain rows
    log.step(6, 'Validating restored data…')
    const tables = ['beds', 'users', 'stages', 'bed_stage_logs', 'audit_logs']
    for (const table of tables) {
      const r = psql([...baseArgs, '-d', tempDb, '-t', '-c', `SELECT COUNT(*) FROM ${table};`], { pgEnv })
      const count = parseInt(r.stdout?.toString().trim(), 10)
      if (isNaN(count)) throw new Error(`Could not read row count for table: ${table}`)
      log.info(`  ${table}: ${count} row(s)`)
    }
    log.success('All key tables verified')
    verificationPassed = true

  } finally {
    // ── 4. Drop temp DB unconditionally ──────────────────────────────────
    log.step(7, `Dropping temp database: ${tempDb}`)
    const drop = psql([...baseArgs, '-d', 'postgres', '-c', `DROP DATABASE IF EXISTS ${tempDb};`], { pgEnv })
    if (drop.status === 0) log.success('Temp database dropped')
    else log.warn(`Could not drop ${tempDb} — please clean up manually`)
  }

  if (!verificationPassed) process.exit(1)
  log.success('Restore verification PASSED ✔')
}

main().catch((err) => {
  try { require('./lib-logger').log.error(`Verification failed: ${err.message}`) }
  catch { console.error('Verification failed:', err.message) }
  process.exit(1)
})
