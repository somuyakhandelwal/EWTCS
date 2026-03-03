import { NextResponse } from 'next/server'
import { verifyActiveSession } from '@/shared/lib/active-session'
import { execBackup } from '@/lib/server/backup-exec'
import path from 'path'
import fs from 'fs'

// Force dynamic — always read live filesystem state
export const dynamic = 'force-dynamic'

const ROOT       = process.cwd()
const BACKUP_DIR = path.resolve(process.env.BACKUP_PATH || path.join(ROOT, 'backups'))

function readBackupFiles() {
  if (!fs.existsSync(BACKUP_DIR)) return []
  return fs
    .readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('ewtcs_backup_'))
    .map(f => {
      const full  = path.join(BACKUP_DIR, f)
      const stats = fs.statSync(full)
      return {
        name:        f,
        sizeBytes:   stats.size,
        sizeKB:      Math.round(stats.size / 1024),
        createdAt:   stats.mtime.toISOString(),
        encrypted:   f.endsWith('.enc'),
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// GET /api/backup/status — list backup files (admin only)
export async function GET() {
  const session = await verifyActiveSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const files   = readBackupFiles()
  const latest  = files[0] ?? null
  const totalKB = files.reduce((sum, f) => sum + f.sizeKB, 0)

  return NextResponse.json({
    backupDir:    BACKUP_DIR,
    totalFiles:   files.length,
    totalKB,
    latest,
    files: files.slice(0, 10), // last 10 shown in UI
    encryptionEnabled: !!process.env.ENCRYPTION_KEY,
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
  })
}

// POST /api/backup/status — trigger a backup run (admin only)
// Calls execBackup() as a background Promise — no child process spawn,
// so no CMD window appears on Windows.
export async function POST() {
  const session = await verifyActiveSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const logsDir   = path.join(ROOT, 'logs')
  fs.mkdirSync(logsDir, { recursive: true })
  const logFile   = path.join(logsDir, 'backup.log')
  const logStream = fs.createWriteStream(logFile, { flags: 'a' })
  const log       = (s: string) => logStream.write(`[${new Date().toISOString()}] ${s}\n`)

  // Fire and forget — HTTP response returns immediately, backup runs in background
  execBackup(log)
    .catch(err => log(`FAILED: ${err.message}`))
    .finally(() => logStream.end())

  return NextResponse.json({
    triggered: true,
    logFile:   path.relative(ROOT, logFile),
    message:   'Backup started in background. Refresh status in ~30 seconds.',
  })
}
