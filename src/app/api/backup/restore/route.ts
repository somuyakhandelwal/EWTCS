import { NextRequest, NextResponse } from 'next/server'
import { verifyActiveSession } from '@/shared/lib/active-session'
import { execRestore } from '@/lib/server/backup-exec'
import path from 'path'
import fs from 'fs'

// Force dynamic — runs restore logic in-process on demand
export const dynamic = 'force-dynamic'

const ROOT       = process.cwd()
const BACKUP_DIR = path.resolve(process.env.BACKUP_PATH || path.join(ROOT, 'backups'))

// POST /api/backup/restore — restore a specific backup file (admin only)
// Body: { filename: string }
// Runs execRestore() in-process as a background Promise — no child process spawn,
// so no CMD window appears on Windows.
export async function POST(req: NextRequest) {
  const session = await verifyActiveSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let filename: string
  try {
    const body = await req.json()
    filename = body?.filename
    if (!filename || typeof filename !== 'string') throw new Error('missing filename')
  } catch {
    return NextResponse.json({ error: 'Body must contain { filename: string }' }, { status: 400 })
  }

  // Prevent path traversal — only files inside BACKUP_DIR are allowed
  const filePath = path.resolve(BACKUP_DIR, path.basename(filename))
  if (!filePath.startsWith(BACKUP_DIR + path.sep) && filePath !== BACKUP_DIR) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Backup file not found' }, { status: 404 })
  }

  const logFile   = path.join(ROOT, 'logs', 'restore.log')
  fs.mkdirSync(path.join(ROOT, 'logs'), { recursive: true })
  const logStream = fs.createWriteStream(logFile, { flags: 'a' })
  const log       = (s: string) => logStream.write(`[${new Date().toISOString()}] ${s}\n`)

  log(`Restore triggered: ${filename}`)

  // execRestore uses spawnSync internally — wrap in Promise so HTTP responds immediately.
  // windowsHide:true on the psql spawns means no CMD window on Windows.
  Promise.resolve()
    .then(() => execRestore(filename, log))
    .catch(err => log(`FAILED: ${err.message}`))
    .finally(() => logStream.end())

  return NextResponse.json({
    triggered: true,
    filename,
    logFile:   'logs/restore.log',
    message:   'Restore started. Check logs/restore.log for progress.',
  })
}
