# EWTCS Quick Start Guide

> Get the Emergency Ward Bed Status Monitoring System running in 5 minutes

## Prerequisites

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **PostgreSQL** 14.x or higher ([Download](https://www.postgresql.org/download/))
- **npm** (comes with Node.js)

## 5-Minute Setup

### 1. Clone and Install

```bash
git clone https://github.com/somuyakhandelwal/EWTCS.git
cd EWTCS
npm install
```

### 2. Start PostgreSQL

**Windows:**
```powershell
# Check if running
Get-Service postgresql*
# If not running, start it via Services or pg_ctl
```

**macOS:**
```bash
brew services start postgresql@14
```

**Linux:**
```bash
sudo systemctl start postgresql
```

### 3. Quick Setup (Automated)

```bash
npm run setup
```

This will:
- ✅ Check prerequisites
- ✅ Create database
- ✅ Configure environment (.env.local)
- ✅ Run migrations
- ✅ Seed test data

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Login

Use these default credentials:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin1` | `Nurse@123` |
| Supervisor | `supervisor1` | `Nurse@123` |
| Nurse | `nurse` or `nurse1` | `Nurse@123` |
| Auditor | `auditor1` | `Nurse@123` |

---

## Troubleshooting

### "Connection refused"
❌ PostgreSQL not running  
✅ Start PostgreSQL (see step 2)

### "Database does not exist"
❌ Database not created  
✅ Run: `npm run db:migrate`

### "Password authentication failed"
❌ Wrong database password  
✅ Edit `.env.local` with correct PostgreSQL password

### "relation 'users' does not exist"
❌ Migrations not applied  
✅ Run: `npm run db:migrate`

---

## What's Included

After setup, your system has:

✅ **12 Emergency Beds** (ER-01 to ER-12)  
✅ **8 Workflow Stages** (Empty → Triage → Registration → Doctor Assessment → Treatment → Decision → Discharge → Cleaning)  
✅ **4 User Accounts** (admin, supervisor, 2 nurses)  
✅ **Complete Tracking System** (automatic timestamps, stage transitions, analytics)

---

## Next Steps

### For Nurses
- View the bed status dashboard at `/dashboard`
- Click beds to update their stage
- Monitor delayed patients (>3 hours)

### For Supervisors
- Access analytics at `/analytics`
- Sign off daily reports (approved badge is permanently recorded)
- View stage duration statistics
- Export data to CSV

### For Admins
- Manage users at `/admin`
- Configure system settings
- View audit logs

### For Developers
- Read [DATABASE_SETUP.md](DATABASE_SETUP.md) for database details
- See [CONFIGURATION.md](CONFIGURATION.md) for deployment
- Check [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
- Review [src/features/README.md](src/features/README.md) for architecture

---

## Common Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run code linting

# Testing
npm test                 # Run full test suite (365 tests)
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report

# Database
npm run db:migrate       # Apply migrations
npm run db:rollback      # Revert last migration
npm run db:seed          # Add test data
npm run db:status        # Check migration status
npm run db:reset         # Reset database (dev only)

# Backup
npm run backup:run       # Run a backup immediately
npm run backup:verify    # Verify latest backup is restorable (restores to temp DB)
npm run backup:restore   # Restore latest backup to the LIVE database (prompts for confirm)
npm run backup:setup     # Install cron / Task Scheduler (run once)

# Validation
npm run validate:env     # Check environment variables
npm run validate:db      # Check database connection
npm run validate:schema  # Verify database schema
npm run validate:all     # Run all validations
```

---

## Setting Up Automated Backups

> **Who does this:** System Administrator, once during initial server setup.

Backups run entirely on this server — PostgreSQL is accessed locally, nothing leaves the hospital network.

### Step 1 — Configure backup settings

Add these lines to your `.env.local`:

```env
# Where backup files are saved.
# For dev: leave blank (defaults to ./backups folder inside the project)
# For production: set to your NAS, external drive, or hospital backup server
BACKUP_PATH=/mnt/hospital-nas/ewtcs-backups

# How many days to keep backup files (older files are auto-deleted)
BACKUP_RETENTION_DAYS=30

# Optional: get an alert when a backup fails
# Works with Slack, Microsoft Teams, ntfy.sh, or any HTTP webhook
BACKUP_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK

# Optional but recommended: encrypt backup files at rest
# Same key you use for DATABASE_URL_ENCRYPTED
ENCRYPTION_KEY=your-encryption-key
```

### Step 2 — Install the scheduler (run once)

```bash
npm run backup:setup
```

**Linux / macOS:** automatically installs two crontab entries:
- Daily backup at **02:00** every night
- Monthly restore test on the **1st of each month at 03:00**

**Windows:** prints the exact `schtasks` commands — copy and run them in an elevated (Admin) Command Prompt.

### Step 3 — Test it works right now

```bash
# Run a backup immediately
npm run backup:run

# Verify the backup is actually restorable
npm run backup:verify
```

Expected output from `backup:run`:
```
═══ EWTCS Database Backup (US-13.4) ═══
[Step 1] Resolving database connection…
✔ Target: localhost:5432/ewtcs (user: postgres)
[Step 2] Preparing backup directory…
• Output: backups/ewtcs_backup_2026-03-03T02-00-00.sql.gz
[Step 3] Running pg_dump…
✔ Backup written — 142 KB → ewtcs_backup_2026-03-03T02-00-00.sql.gz
[Step 4] Applying local retention policy…
• Retention: 30 days — removed 0 expired backup(s)
✔ Backup complete ✔
```

### What each backup contains

| File extension | Meaning |
|---|---|
| `.sql.gz` | Compressed backup (no `ENCRYPTION_KEY` set) |
| `.sql.gz.enc` | Compressed + AES-256 encrypted (when `ENCRYPTION_KEY` is set) |

### Logs

After the scheduler runs automatically, logs are written to:
```
logs/backup.log          ← daily backup output
logs/backup-verify.log   ← monthly restore test output
```

### Restoring from a Backup

> **When to use:** Database corruption, accidental deletion, system migration, or disaster recovery.

#### Option A — CLI (recommended for production)

```bash
# Restore the latest backup (prompts for confirmation)
npm run backup:restore

# Restore a specific file
node scripts/db-restore.mjs /path/to/ewtcs_backup_2026-03-01T02-00-00.sql.gz.enc

# Skip confirmation (for scripted recovery)
node scripts/db-restore.mjs --yes
```

The script will:
1. Decrypt and decompress the chosen backup file
2. Terminate active database connections
3. Drop and recreate the `public` schema (clean slate)
4. Pipe the SQL dump back into PostgreSQL
5. Print a success message with the file used

> ⚠ **This overwrites all current data** — take a fresh backup first if in doubt: `npm run backup:run`

#### Option B — Admin UI

1. Log in with an **Admin** account
2. Go to **Admin → Database Backups**
3. In the file table, find the backup you want and click **Restore**
4. The button turns red — click **Confirm Restore** to proceed
5. The restore runs in the background; progress is in `logs/restore.log`

#### After any restore

- Restart the Next.js app: `npm run dev` (or your production process manager)
- Verify the data looks correct via the main application
- Run `npm run backup:verify` to confirm the restore produced a valid state

---

### Shifting to production later

When the database moves to a dedicated server, only two things change in `.env.local`:
- `BACKUP_PATH` → point to hospital-approved storage
- Re-run `npm run backup:setup` on the new server

No code changes needed.

---

## Support

- **Documentation**: See [README.md](README.md)
- **Issues**: [GitHub Issues](https://github.com/somuyakhandelwal/EWTCS/issues)
- **Email**: somuyakhandelwal@gmail.com

---

**Ready to start?** Run `npm run setup` now!
