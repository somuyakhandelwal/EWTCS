// US-13.4: Automated Database Backup Script
// Runs pg_dump → gzip → (optional AES-256-CBC encrypt) → configurable output dir
// Usage:   node scripts/db-backup.mjs
// Schedule: server crontab / Windows Task Scheduler (see: npm run backup:setup)
// Shift to production: set BACKUP_PATH env var to NAS/external mount point

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { createWriteStream } from 'fs'
import { createGzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { spawn } from 'child_process'
import { createCipheriv, randomBytes, scryptSync } from 'crypto'
import https from 'https'
import http from 'http'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ─── Load env (mirrors daily-summary-cron.mjs pattern) ───────────────────────
function loadEnv() {
  const dotenv = require('dotenv')
  const nodeEnv = process.env.NODE_ENV || 'development'
  for (const f of ['.env', `.env.${nodeEnv}`, '.env.local']) {
    const full = path.resolve(ROOT, f)
    if (fs.existsSync(full)) dotenv.config({ path: full, override: true })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isoTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

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

function deriveKey(encryptionKey) {
  // Same salt and algorithm as scripts/encrypt-secret.js for consistency
  return scryptSync(encryptionKey, 'EWTCS_SALT_2026', 32)
}

// ─── Failure alert (best-effort webhook POST — no new dependencies) ──────────
// Set BACKUP_ALERT_WEBHOOK_URL to a Slack/Teams/ntfy/custom HTTP endpoint.
// If unset, alert is skipped silently.
function sendAlert(message) {
  const webhookUrl = process.env.BACKUP_ALERT_WEBHOOK_URL
  if (!webhookUrl) return Promise.resolve()
  return new Promise((resolve) => {
    try {
      const { hostname, port, pathname, search, protocol } = new URL(webhookUrl)
      const body = JSON.stringify({ text: message })
      const opts = {
        hostname, port: port || undefined,
        path: pathname + (search || ''), method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }
      const mod = protocol === 'https:' ? https : http
      const req = mod.request(opts, resolve)
      req.on('error', resolve) // never throw — alert is best-effort
      req.write(body); req.end()
    } catch { resolve() }
  })
}

function applyRetention(backupDir, retentionDays) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  let removed = 0
  for (const file of fs.readdirSync(backupDir)) {
    if (!file.startsWith('ewtcs_backup_')) continue
    const full = path.join(backupDir, file)
    const { mtimeMs } = fs.statSync(full)
    if (mtimeMs < cutoff) { fs.unlinkSync(full); removed++ }
  }
  return removed
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  loadEnv()
  const { log } = require('./lib-logger')
  const { resolveDatabaseUrl } = require('./lib-env')

  log.header('═══ EWTCS Database Backup (US-13.4) ═══')

  // ── 1. Resolve DATABASE_URL (supports encrypted secrets) ─────────────────
  log.step(1, 'Resolving database connection…')
  let dbUrl
  try {
    dbUrl = resolveDatabaseUrl()
  } catch (err) {
    log.error(`Cannot resolve DATABASE_URL: ${err.message}`)
    process.exit(1)
  }

  const db = parseDbUrl(dbUrl)
  log.success(`Target: ${db.host}:${db.port}/${db.dbname} (user: ${db.user})`)

  // ── 2. Prepare output directory and file path ─────────────────────────────
  log.step(2, 'Preparing backup directory…')
  // BACKUP_PATH: set to any local/NAS/mounted path to shift storage location.
  // Default: <project-root>/backups — works for local dev with zero config.
  const backupDir = path.resolve(process.env.BACKUP_PATH || path.join(ROOT, 'backups'))
  fs.mkdirSync(backupDir, { recursive: true })

  const encKey = process.env.ENCRYPTION_KEY || ''
  const ext    = encKey ? 'sql.gz.enc' : 'sql.gz'
  const outPath = path.join(backupDir, `ewtcs_backup_${isoTimestamp()}.${ext}`)
  log.info(`Output: ${path.relative(ROOT, outPath)}`)

  // ── 3. Spawn pg_dump ──────────────────────────────────────────────────────
  log.step(3, 'Running pg_dump…')

  // Pass PGPASSWORD via child env — never logged, never shell-interpolated
  const pgEnv = { ...process.env, PGPASSWORD: db.password, PGSSLMODE: process.env.PGSSLMODE || 'prefer' }
  delete pgEnv.ENCRYPTION_KEY  // do not forward key to child process

  const pgDump = spawn('pg_dump', [
    '-h', db.host, '-p', db.port, '-U', db.user, '-d', db.dbname,
    '--no-password', '--format=plain', '--encoding=UTF8',
  ], { env: pgEnv, stdio: ['ignore', 'pipe', 'pipe'] })

  let stderrBuf = ''
  pgDump.stderr.on('data', (chunk) => { stderrBuf += chunk.toString() })

  // Set up exit-code promise BEFORE any await to avoid missing the close event
  const pgDumpExit = new Promise((resolve, reject) => {
    pgDump.on('close', (code) => {
      if (code !== 0) reject(new Error(`pg_dump exited ${code}: ${stderrBuf.trim()}`))
      else resolve()
    })
  })

  // ── 4. Stream pg_dump stdout → gzip → (cipher →) file ────────────────────
  const gzip = createGzip({ level: 9 })

  if (encKey) {
    // Write 16-byte IV header synchronously, then append AES-256-CBC cipher stream
    const key = deriveKey(encKey)
    const iv  = randomBytes(16)
    const fd  = fs.openSync(outPath, 'w')
    fs.writeSync(fd, iv)
    fs.closeSync(fd)

    const cipher    = createCipheriv('aes-256-cbc', key, iv)
    const outStream = createWriteStream(outPath, { flags: 'a' })
    await pipeline(pgDump.stdout, gzip, cipher, outStream)
    log.info('Backup encrypted with AES-256-CBC (ENCRYPTION_KEY)')
  } else {
    const outStream = createWriteStream(outPath)
    await pipeline(pgDump.stdout, gzip, outStream)
    log.warn('ENCRYPTION_KEY not set — backup is unencrypted (recommended for dev only)')
  }

  // Ensure pg_dump itself exited cleanly (after pipeline drains stdout)
  await pgDumpExit

  const sizeKB = Math.round(fs.statSync(outPath).size / 1024)
  log.success(`Backup written — ${sizeKB} KB → ${path.basename(outPath)}`)

  // ── 5. Apply local retention policy ──────────────────────────────────────
  log.step(4, 'Applying local retention policy…')
  const retentionDays = Math.max(1, parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10))
  const removed = applyRetention(backupDir, retentionDays)
  log.info(`Retention: ${retentionDays} days — removed ${removed} expired backup(s)`)

  log.success(`Backup complete ✔  →  ${path.basename(outPath)}`)
}

main().catch(async (err) => {
  // Require logger lazily in case the error occurred before loadEnv()
  try { require('./lib-logger').log.error(`Backup failed: ${err.message}`) }
  catch { console.error('Backup failed:', err.message) }
  // Fire alert webhook if configured — failures trigger alerts (AC)
  await sendAlert(`[EWTCS] Database backup FAILED — ${new Date().toISOString()}\n${err.message}`).catch(() => {})
  process.exit(1)
})
