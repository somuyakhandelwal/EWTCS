// US-13.4: Backup Scheduler Setup
// Installs the daily backup cron entry on Linux / macOS.
// On Windows, prints the equivalent Task Scheduler command.
// Usage: node scripts/setup-backup-cron.mjs

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { execSync, spawnSync } from 'child_process'

const require  = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT     = path.resolve(__dirname, '..')

// ─── Load env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  const dotenv  = require('dotenv')
  const nodeEnv = process.env.NODE_ENV || 'development'
  for (const f of ['.env', `.env.${nodeEnv}`, '.env.local']) {
    const full = path.resolve(ROOT, f)
    if (fs.existsSync(full)) dotenv.config({ path: full, override: true })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const NODE_BIN  = process.execPath                          // exact node binary
const BACKUP_SCRIPT  = path.join(ROOT, 'scripts', 'db-backup.mjs')
const VERIFY_SCRIPT  = path.join(ROOT, 'scripts', 'db-backup-verify.mjs')
const LOG_DIR        = path.join(ROOT, 'logs')

// Daily at 02:00 local time  → backup
// Monthly on 1st at 03:00   → verify
const DAILY_CRON   = `0 2 * * *   cd "${ROOT}" && "${NODE_BIN}" scripts/db-backup.mjs >> logs/backup.log 2>&1`
const MONTHLY_CRON = `0 3 1 * *   cd "${ROOT}" && "${NODE_BIN}" scripts/db-backup-verify.mjs >> logs/backup-verify.log 2>&1`
const CRON_MARKER  = '# EWTCS-DB-BACKUP'

// ─── Linux / macOS ───────────────────────────────────────────────────────────
function installLinuxCron({ log }) {
  // Ensure logs/ dir exists
  fs.mkdirSync(LOG_DIR, { recursive: true })
  log.info(`Log directory: ${LOG_DIR}`)

  // Read current crontab (empty string if none)
  let current = ''
  try { current = execSync('crontab -l 2>/dev/null').toString() } catch { /* no crontab yet */ }

  if (current.includes(CRON_MARKER)) {
    log.warn('EWTCS backup cron entries already installed. Remove them manually before re-running.')
    log.info('Your crontab:')
    console.log(current)
    return
  }

  const newCrontab = [
    current.trimEnd(),
    '',
    `${CRON_MARKER} — managed by npm run backup:setup — do not edit this line`,
    DAILY_CRON,
    MONTHLY_CRON,
    '',
  ].join('\n')

  // Write via stdin to crontab -
  const result = spawnSync('crontab', ['-'], { input: newCrontab, stdio: ['pipe', 'inherit', 'inherit'] })
  if (result.status !== 0) {
    log.error('Failed to write crontab. Try running manually:')
    console.log('\ncrontab -e\n')
    console.log(`# Add these lines:\n${DAILY_CRON}\n${MONTHLY_CRON}`)
    process.exit(1)
  }

  log.success('Cron entries installed successfully!')
  log.info('Daily backup : 02:00 local time every day')
  log.info('Monthly check: 03:00 on the 1st of each month')
  log.info(`Logs written to: ${LOG_DIR}/`)
}

// ─── Windows ─────────────────────────────────────────────────────────────────
function printWindowsInstructions({ log }) {
  fs.mkdirSync(LOG_DIR, { recursive: true })

  log.info('Windows detected — run these commands in an elevated (Admin) Command Prompt:')
  console.log('')
  console.log('-- Daily backup at 02:00 AM every day --')
  console.log(`schtasks /Create /F /SC DAILY /ST 02:00 /TN "EWTCS-DB-Backup" ^`)
  console.log(`  /TR "cmd /c cd /d \\"${ROOT}\\" && \\"${NODE_BIN}\\" scripts\\db-backup.mjs >> logs\\backup.log 2>&1"`)
  console.log('')
  console.log('-- Monthly restore verification at 03:00 on 1st of month --')
  console.log(`schtasks /Create /F /SC MONTHLY /D 1 /ST 03:00 /TN "EWTCS-DB-Backup-Verify" ^`)
  console.log(`  /TR "cmd /c cd /d \\"${ROOT}\\" && \\"${NODE_BIN}\\" scripts\\db-backup-verify.mjs >> logs\\backup-verify.log 2>&1"`)
  console.log('')
  log.info('To verify tasks were created:')
  console.log('  schtasks /Query /TN "EWTCS-DB-Backup"')
  console.log('  schtasks /Query /TN "EWTCS-DB-Backup-Verify"')
  log.info(`Logs will be written to: ${LOG_DIR}\\`)
}

// ─── Main ────────────────────────────────────────────────────────────────────
function main() {
  loadEnv()
  const { log } = require('./lib-logger')

  log.header('═══ EWTCS Backup Cron Setup (US-13.4) ═══')
  log.info(`Platform : ${os.platform()} (${os.type()})`)
  log.info(`Project  : ${ROOT}`)
  log.info(`Node     : ${NODE_BIN}`)
  log.info(`Backup script  : ${BACKUP_SCRIPT}`)
  log.info(`Verify script  : ${VERIFY_SCRIPT}`)
  console.log('')

  if (os.platform() === 'win32') {
    printWindowsInstructions({ log })
  } else {
    installLinuxCron({ log })
  }

  log.success('Setup complete. Run a test backup now: npm run backup:run')
}

main()
