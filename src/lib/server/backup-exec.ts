// US-13.4: In-process backup/restore execution — no child Node.js spawn.
// pg_dump and psql are the only subprocesses; both use windowsHide:true
// so no CMD window appears on Windows regardless of how the app is started.

import path from 'path'
import fs, { createWriteStream } from 'fs'
import { createGzip, gunzipSync } from 'zlib'
import { pipeline } from 'stream/promises'
import { spawn, spawnSync } from 'child_process'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ROOT = process.cwd()
const SALT = 'EWTCS_SALT_2026'

// ─── DB URL resolution (mirrors scripts/lib-env.js) ──────────────────────────
function resolveDbUrl(): string {
  const enc = process.env.DATABASE_URL_ENCRYPTED
  const key = process.env.ENCRYPTION_KEY
  if (enc) {
    if (!key) throw new Error('ENCRYPTION_KEY required to decrypt DATABASE_URL_ENCRYPTED')
    const [ivHex, encHex] = enc.split(':')
    const k = scryptSync(key, SALT, 32)
    const d = createDecipheriv('aes-256-cbc', k, Buffer.from(ivHex, 'hex'))
    return d.update(encHex, 'hex', 'utf8') + d.final('utf8')
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
  return process.env.DATABASE_URL
}

function parseDbUrl(url: string) {
  const u = new URL(url)
  return {
    host:     u.hostname || 'localhost',
    port:     u.port     || '5432',
    user:     decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    dbname:   u.pathname.replace(/^\//, ''),
  }
}

function deriveKey(encKey: string) { return scryptSync(encKey, SALT, 32) }
function isoTs() { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) }

// ─── Backup ───────────────────────────────────────────────────────────────────
// Runs entirely in this process — pg_dump spawned with windowsHide:true.
export async function execBackup(log: (s: string) => void): Promise<string> {
  const db      = parseDbUrl(resolveDbUrl())
  const backupDir = path.resolve(process.env.BACKUP_PATH || path.join(ROOT, 'backups'))
  fs.mkdirSync(backupDir, { recursive: true })

  const encKey = process.env.ENCRYPTION_KEY || ''
  const ext    = encKey ? 'sql.gz.enc' : 'sql.gz'
  const outPath = path.join(backupDir, `ewtcs_backup_${isoTs()}.${ext}`)

  const pgEnv: NodeJS.ProcessEnv = { ...process.env, PGPASSWORD: db.password }
  delete pgEnv['ENCRYPTION_KEY']

  const pgDump = spawn('pg_dump', [
    '-h', db.host, '-p', db.port, '-U', db.user, '-d', db.dbname,
    '--no-password', '--format=plain', '--encoding=UTF8',
  ], { env: pgEnv, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })

  pgDump.stderr!.on('data', (chunk: Buffer) => log(chunk.toString().trim()))

  const exit = new Promise<void>((res, rej) =>
    pgDump.on('close', (code: number | null) =>
      code === 0 ? res() : rej(new Error(`pg_dump exited ${code}`))
    )
  )

  const gzip = createGzip({ level: 9 })
  if (encKey) {
    const key = deriveKey(encKey)
    const iv  = randomBytes(16)
    const fd  = fs.openSync(outPath, 'w')
    fs.writeSync(fd, iv); fs.closeSync(fd)
    const cipher = createCipheriv('aes-256-cbc', key, iv)
    await pipeline(pgDump.stdout!, gzip, cipher, createWriteStream(outPath, { flags: 'a' }))
  } else {
    await pipeline(pgDump.stdout!, gzip, createWriteStream(outPath))
  }
  await exit

  // Retention — delete files older than BACKUP_RETENTION_DAYS
  const days   = Math.max(1, parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10))
  const cutoff = Date.now() - days * 86_400_000
  for (const f of fs.readdirSync(backupDir)) {
    if (!f.startsWith('ewtcs_backup_')) continue
    const fp = path.join(backupDir, f)
    if (fs.statSync(fp).mtimeMs < cutoff) { fs.unlinkSync(fp); log(`Removed expired: ${f}`) }
  }

  log(`Backup complete: ${path.basename(outPath)}`)
  return path.basename(outPath)
}

// ─── Restore ─────────────────────────────────────────────────────────────────
// spawnSync calls use windowsHide:true. Called from API route via background Promise.
export function execRestore(filename: string, log: (s: string) => void): void {
  const backupDir = path.resolve(process.env.BACKUP_PATH || path.join(ROOT, 'backups'))
  const filePath  = path.resolve(backupDir, path.basename(filename))
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filename}`)

  const isEnc  = filePath.endsWith('.enc')
  const encKey = process.env.ENCRYPTION_KEY || ''
  if (isEnc && !encKey) throw new Error('File is encrypted but ENCRYPTION_KEY is not set')

  const db    = parseDbUrl(resolveDbUrl())
  const pgEnv: NodeJS.ProcessEnv = { ...process.env, PGPASSWORD: db.password }
  const base  = ['-h', db.host, '-p', db.port, '-U', db.user, '--no-password']

  const raw        = fs.readFileSync(filePath)
  const compressed = isEnc
    ? (() => {
        const d = createDecipheriv('aes-256-cbc', deriveKey(encKey), raw.slice(0, 16))
        return Buffer.concat([d.update(raw.slice(16)), d.final()])
      })()
    : raw
  const sql = gunzipSync(compressed)
  log(`Decompressed: ${Math.round(sql.length / 1024)} KB`)

  const run = (args: string[], input?: Buffer) =>
    spawnSync('psql', args, {
      env: pgEnv, input, windowsHide: true,
      stdio: input ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
    })

  log('Terminating active connections…')
  run([...base, '-d', db.dbname, '-c',
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${db.dbname}' AND pid<>pg_backend_pid();`])

  log('Dropping and recreating public schema…')
  const clean = run([...base, '-d', db.dbname, '-c',
    'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;'])
  if (clean.status !== 0) throw new Error(`Schema drop failed: ${clean.stderr?.toString().trim()}`)

  log('Restoring data from backup…')
  const restore = run([...base, '-d', db.dbname, '--set=ON_ERROR_STOP=off'], sql)
  if (restore.status !== 0 && restore.stderr?.toString().includes('FATAL')) {
    throw new Error(`Restore failed: ${restore.stderr?.toString().slice(0, 300)}`)
  }
  log(`Restore complete: ${filename}`)
}
