// US-13.4: Database Restore Script
// Decrypts (if .enc) + restores a backup file to the live EWTCS database.
// Usage:   node scripts/db-restore.mjs [backup-file] [--yes]
//          Omit file path to auto-select the latest backup from BACKUP_PATH.
//          --yes  skips the interactive confirmation prompt (used by API/cron).
// WARNING: This OVERWRITES the live database. Always verified by IT before use.

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { gunzipSync } from 'zlib'
import { createDecipheriv, scryptSync } from 'crypto'
import { spawnSync } from 'child_process'
import { createInterface } from 'readline/promises'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ─── Load env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  const dotenv = require('dotenv')
  const nodeEnv = process.env.NODE_ENV || 'development'
  for (const f of ['.env', `.env.${nodeEnv}`, '.env.local']) {
    const full = path.resolve(ROOT, f)
    if (fs.existsSync(full)) dotenv.config({ path: full, override: true })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseDbUrl(url) {
  const u = new URL(url)
  return {
    host:     u.hostname || 'localhost',
    port:     u.port     || '5432',
    user:     decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    dbname:   u.pathname.replace(/^\//, ''),
  }
}

function decryptAndDecompress(filePath, encKey) {
  const raw = fs.readFileSync(filePath)
  let compressed
  if (encKey) {
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

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  loadEnv()
  const { log } = require('./lib-logger')
  const { resolveDatabaseUrl } = require('./lib-env')

  log.header('═══ EWTCS Database Restore (US-13.4) ═══')

  // Parse args
  const args       = process.argv.slice(2)
  const skipConfirm = args.includes('--yes')
  const fileArg    = args.find(a => !a.startsWith('--'))

  // ── 1. Resolve backup file ────────────────────────────────────────────────
  let backupFile = fileArg
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

  // ── 2. Resolve database connection ───────────────────────────────────────
  log.step(2, 'Resolving database connection…')
  let dbUrl
  try { dbUrl = resolveDatabaseUrl() }
  catch (err) { log.error(err.message); process.exit(1) }

  const db      = parseDbUrl(dbUrl)
  const pgEnv   = { ...process.env, PGPASSWORD: db.password }
  const baseArgs = ['-h', db.host, '-p', db.port, '-U', db.user, '--no-password']

  // ── 3. Confirm (unless --yes / triggered by API) ──────────────────────────
  if (!skipConfirm) {
    log.warn(`\n⚠  This will OVERWRITE the live database: "${db.dbname}" on ${db.host}`)
    log.warn('   All current data will be replaced with the backup.')
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const answer = await rl.question('\n   Type "yes" to continue, anything else to cancel: ')
    rl.close()
    if (answer.trim().toLowerCase() !== 'yes') {
      log.warn('Restore cancelled.')
      process.exit(0)
    }
  }

  // ── 4. Decrypt and decompress into memory ────────────────────────────────
  log.step(3, 'Decrypting and decompressing backup…')
  let sqlData
  try {
    sqlData = decryptAndDecompress(backupFile, isEncrypted ? encKey : null)
    log.success(`Decompressed SQL: ${Math.round(sqlData.length / 1024)} KB`)
  } catch (err) {
    log.error(`Decrypt/decompress failed: ${err.message}`)
    process.exit(1)
  }

  // ── 5. Terminate other connections so schema drop succeeds ────────────────
  log.step(4, 'Terminating other database connections…')
  psql([...baseArgs, '-d', db.dbname, '-c',
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${db.dbname}' AND pid<>pg_backend_pid();`
  ], { pgEnv })

  // ── 6. Drop public schema (removes all tables) and recreate clean ─────────
  log.step(5, 'Dropping existing schema…')
  const clean = psql([...baseArgs, '-d', db.dbname, '-c',
    'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;'
  ], { pgEnv })
  if (clean.status !== 0) {
    log.error(`Schema drop failed: ${clean.stderr?.toString().trim()}`)
    process.exit(1)
  }
  log.success('Schema cleared')

  // ── 7. Restore SQL dump ───────────────────────────────────────────────────
  log.step(6, 'Restoring data from backup…')
  const restore = psql([...baseArgs, '-d', db.dbname, '--set=ON_ERROR_STOP=off'], { pgEnv, input: sqlData })
  if (restore.status !== 0 && restore.stderr?.toString().includes('FATAL')) {
    log.error(`Restore failed: ${restore.stderr?.toString().slice(0, 400)}`)
    process.exit(1)
  }

  log.success(`Restore complete ✔ — database "${db.dbname}" has been recovered`)
  log.info(`Backup used: ${path.basename(backupFile)}`)
}

main().catch((err) => {
  try { require('./lib-logger').log.error(`Restore failed: ${err.message}`) }
  catch { console.error('Restore failed:', err.message) }
  process.exit(1)
})
