# Database Setup Guide

Complete guide for setting up the EWTCS PostgreSQL database for local development.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Database Schema](#database-schema)
- [Troubleshooting](#troubleshooting)
- [Migration Commands](#migration-commands)

---

## Prerequisites

Before setting up the database, ensure you have:

1. **PostgreSQL 14 or higher** installed
   - Windows: [Download PostgreSQL](https://www.postgresql.org/download/windows/)
   - macOS: `brew install postgresql@14`
   - Linux: `sudo apt install postgresql-14`

2. **PostgreSQL running**
   ```bash
   # Check if PostgreSQL is running
   # Windows (PowerShell)
   Get-Service postgresql*
   
   # macOS/Linux
   pg_isready
   ```

3. **PostgreSQL credentials**
   - Default username: `postgres`
   - Password: (set during installation)
   - Port: 5432 (default)

---

## Quick Start

For experienced developers who just need the commands:

```bash
# 1. Create database
createdb ewtcs
# OR using psql: CREATE DATABASE ewtcs;

# 2. Copy environment template
cp .env.example .env.local

# 3. Edit .env.local with your database credentials
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ewtcs

# 4. Run migrations (creates all tables)
npm run db:migrate

# 5. Seed initial data (creates admin user, stages, sample beds)
npm run db:seed

# 6. Verify setup
npm run db:status

# 7. Start development server
npm run dev
```

**Default Admin Credentials:**
- Username: `admin`
- Password: `Admin@123`

---

## Detailed Setup

### Step 1: Create Database

#### Option A: Using `createdb` command (Recommended)

```bash
# Create database
createdb ewtcs

# Verify creation
psql -l | grep ewtcs
```

#### Option B: Using psql

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ewtcs;

# Exit psql
\q
```

#### Option C: Using pgAdmin (GUI)

1. Open pgAdmin
2. Right-click "Databases" → "Create" → "Database"
3. Name: `ewtcs`
4. Save

---

### Step 2: Configure Environment Variables

1. **Copy the template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local`** with your actual credentials:

   ```env
   # Required: Database connection
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ewtcs
   
   # Required: Application URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   
   # Required: Environment
   NODE_ENV=development
   
   # Optional: Alert threshold (3 hours = 10800000ms)
   RED_ALERT_THRESHOLD_MS=10800000
   ```

3. **Important notes:**
   - Replace `YOUR_PASSWORD` with your actual PostgreSQL password
   - If password contains special characters, URL-encode them:
     - `@` → `%40`
     - `#` → `%23`
     - `&` → `%26`
   - **Never commit `.env.local` to Git** (already in .gitignore)

---

### Step 3: Run Database Migrations

Migrations create all required tables and indexes:

```bash
npm run db:migrate
```

This will create:
- ✅ `users` table (authentication & authorization)
- ✅ `audit_logs` table (security logging)
- ✅ `stages` table (patient workflow stages)
- ✅ `beds` table (emergency ward beds)
- ✅ `bed_stage_logs` table (bed history tracking)

**Expected output:**
```
Running migrations...
✓ 001_init.sql
✓ 002_add_user_lockout.sql
✓ 003_add_user_management.sql
✓ 004_generic_audit_logs.sql
✓ 005_create_beds_and_stages.sql
✓ 006_add_ward_access_control.sql
All migrations completed successfully
```

---

### Step 4: Seed Initial Data

Seed scripts populate the database with necessary initial data:

```bash
npm run db:seed
```

This will create:
- ✅ Admin user (username: `admin`, password: `Admin@123`)
- ✅ 8 patient workflow stages (Empty, Triage, Registration, etc.)
- ✅ 20 sample emergency beds (ER-01 through ER-20)

**Expected output:**
```
Seeding database...
✓ Created admin user
✓ Created 8 stages
✓ Created 20 beds
Database seeded successfully
```

---

### Step 5: Verify Setup

Check that everything is working:

```bash
# Check migration status
npm run db:status

# Test database connection
npm run dev
```

Visit [http://localhost:3000/login](http://localhost:3000/login) and log in:
- **Username:** `admin`
- **Password:** `Admin@123`

---

## Database Schema

### Tables Overview

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | Authentication & user management | id, username, role, password_hash, ward_id |
| `audit_logs` | Security & compliance logging | id, action_type, performed_by, timestamp |
| `stages` | Patient workflow stages | id, name, display_order, color_code |
| `beds` | Emergency ward beds | id, bed_number, current_stage_id, is_occupied, ward_id |
| `bed_stage_logs` | Bed transition history | id, bed_id, from_stage_id, to_stage_id, transition_time |
| `stage_transitions` | Workflow rules for stage updates | from_stage_id, to_stage_id, is_allowed, requires_supervisor_override |
| `wards` | Hospital ward definitions | id, name, code, description, is_active |
| `patient_admissions` | Completed patient stays (source of truth for analytics) | id, bed_id, admitted_at, discharged_at, duration_ms |
| `shifts` | Shift definitions for filtering | id, name, start_time, end_time |
| `system_settings` | Global configurable thresholds (key-value store) | key, value, updated_at |
| `stage_delay_thresholds` | Per-stage delay threshold overrides | stage_id, threshold_minutes |
| `disposition_delay_reasons` | Open delay reason log per bed | id, bed_id, reason, recorded_at, resolved_at |
| `token_blacklist` | Invalidated JWT tokens | token_hash, expires_at |
| `kiosk_sessions` | Kiosk mode session tracking | id, ward_id, created_at, expires_at |

### US-21.1 Triage Demographics (beds table)

Migration `046_add_patient_demographics_to_beds.sql` adds active triage demographic columns to `beds`:

- `patient_uhid` (varchar)
- `patient_ipd_id` (varchar, optional)
- `patient_name` (varchar)
- `patient_age` (integer, constrained to 1-130)
- `patient_gender` (varchar, constrained to Male/Female/Other/Unknown)
- `key_symptom` (text)
- `triage_category` (varchar)

These values represent the active patient currently occupying a bed and are reset during discharge/non-patient transitions.

### Default Stages

| Stage | Order | Color | Description |
|-------|-------|-------|-------------|
| Empty | 0 | Gray | Bed available and ready |
| Triage | 1 | Blue | Initial assessment |
| Registration | 2 | Cyan | Patient documentation |
| Doctor Assessment | 3 | Yellow | Doctor examining patient |
| Treatment/Observation | 4 | Orange | Receiving treatment |
| Decision Made | 5 | Green | Discharge/admission decided |
| Discharge Process | 6 | Purple | Being discharged |
| Cleaning | 7 | Pink | Bed being cleaned |

### Stage Transition Rules

Stage transition rules are stored in the `stage_transitions` table (migration 010). These rules control which stage updates are allowed, which require supervisor approval, and which are blocked.

Key fields:
- `from_stage_id`: Source stage (NULL means any current stage)
- `to_stage_id`: Destination stage
- `is_allowed`: Whether the transition is allowed without override
- `requires_supervisor_override`: If true, only supervisors/admins can approve
- `priority`: Higher priority rules override lower ones

Default rules are seeded by migration 010 and reflect the standard emergency workflow with safe override options for edge cases.

### Relationships

```
users (1) ──< (many) audit_logs
users (1) ──< (many) bed_stage_logs
stages (1) ──< (many) beds
stages (1) ──< (many) bed_stage_logs
beds (1) ──< (many) bed_stage_logs
wards (1) ──< (many) users
wards (1) ──< (many) beds
```

---

## System Settings (Configurable Thresholds)

The `system_settings` table is a key-value store for global runtime configuration. Values can be updated by admins via the `/analytics` page without a code deployment.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `los_target_minutes` | integer | — | Target length-of-stay in minutes for the LOS trend chart |
| `delay_threshold_minutes` | integer | 180 | Minutes after which a patient stay is considered delayed |
| `escalation_threshold_minutes` | integer | 360 | Minutes after which a delayed patient is escalated |
| `delay_target_pct` | decimal | — | Target % of delayed patients (displayed on the Delayed Patients gauge) |

**Priority chain for delay threshold resolution:**
`los_target_minutes` → `delay_threshold_minutes` → 180 min hard-coded fallback

**Per-stage overrides:** The `stage_delay_thresholds` table allows individual stages to have their own threshold, overriding the global setting.

---

## Performance Indexes (Migration 022)

Migration 022 adds database indexes supporting the Dashboard (<2s) and Reports (<3s) SLA targets. These indexes are non-destructive (`IF NOT EXISTS`) and can be safely re-applied.

| Index | Table | Columns | Purpose |
|-------|-------|---------|--------|
| `idx_bed_stage_logs_bed_id_time` | `bed_stage_logs` | `bed_id, transition_time DESC` | Primary filter for transition and TAT queries |
| `idx_bed_stage_logs_transition_time` | `bed_stage_logs` | `transition_time DESC` | Date-range analytics filtering |
| `idx_bed_stage_logs_to_stage_id` | `bed_stage_logs` | `to_stage_id` | Stage duration stats GROUP BY |
| `idx_bed_stage_logs_from_stage_id` | `bed_stage_logs` | `from_stage_id` | TAT queries filtering by from+to stage |
| `idx_beds_is_active` | `beds` | `is_active` (partial) | Dashboard active beds filter |
| `idx_beds_is_active_occupied` | `beds` | `is_active, is_occupied` (partial) | Wait-time occupied beds filter |
| `idx_stage_delay_thresholds_stage_id` | `stage_delay_thresholds` | `stage_id` (unique) | Per-stage threshold lookup |
| `idx_disp_delay_reasons_bed_open` | `disposition_delay_reasons` | `bed_id, recorded_at DESC` (partial, unresolved) | Bottleneck LATERAL join |
| `idx_system_settings_key` | `system_settings` | `key` (unique) | Global threshold key lookups |
| `idx_stages_name_lower` | `stages` | `LOWER(name)` | Stage name matching (cleaning/empty detection) |

> **Note:** `CONCURRENTLY` is not used because migrations run inside a single transaction.

---

## Additional Dashboard Performance Indexes (Migration 1740649700000)

Migration `1740649700000_add-performance-indexes.js` adds supplementary indexes targeting the main bed dashboard query (Epic 1 / Epic 13). These are applied via `node-postgres-migrate` and run alongside the numbered SQL migrations.

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_beds_active_number` | `beds` | `is_active, bed_number` (partial) | Dashboard active-beds filtering |
| `idx_beds_current_stage` | `beds` | `current_stage_id` | Speed up JOIN with stages table |
| `idx_disposition_unresolved` | `disposition_delay_reasons` | `bed_id, resolved_at` (partial, unresolved) | LATERAL JOIN in `getBedsWithElapsedTime` |
| `idx_stage_thresholds_lookup` | `stage_delay_thresholds` | `stage_id` | Per-stage delay threshold lookups |

---

## Ward Access Control Setup

**Migration 006** adds ward-level access control to prevent IDOR (Insecure Direct Object Reference) attacks. Nurses can only update beds in their assigned ward.

### Default Wards

Three wards are created automatically:
- **Emergency Ward A** (Code: `EWA`)
- **Emergency Ward B** (Code: `EWB`)
- **Emergency Ward C** (Code: `EWC`)

### Assign Users to Wards

After seeding users, assign them to wards:

```sql
-- Connect to database
psql -U postgres -d ewtcs

-- View available wards
SELECT id, name, code FROM wards;

-- Assign nurse1 to Emergency Ward A
UPDATE users 
SET ward_id = (SELECT id FROM wards WHERE code = 'EWA') 
WHERE username = 'nurse1';

-- Assign nurse to Emergency Ward B
UPDATE users 
SET ward_id = (SELECT id FROM wards WHERE code = 'EWB') 
WHERE username = 'nurse';

-- Verify assignments
SELECT username, role, w.name as ward_name, w.code as ward_code
FROM users u
LEFT JOIN wards w ON u.ward_id = w.id
WHERE role IN ('nurse', 'supervisor');
```

### Assign Beds to Wards

Distribute beds across wards:

```sql
-- Assign ER-01 to ER-17 to Emergency Ward A
UPDATE beds 
SET ward_id = (SELECT id FROM wards WHERE code = 'EWA'),
    ward_name = 'Emergency Ward A'
WHERE bed_number BETWEEN 'ER-01' AND 'ER-17';

-- Assign ER-18 to ER-34 to Emergency Ward B
UPDATE beds 
SET ward_id = (SELECT id FROM wards WHERE code = 'EWB'),
    ward_name = 'Emergency Ward B'
WHERE bed_number BETWEEN 'ER-18' AND 'ER-34';

-- Assign ER-35 to ER-50 to Emergency Ward C
UPDATE beds 
SET ward_id = (SELECT id FROM wards WHERE code = 'EWC'),
    ward_name = 'Emergency Ward C'
WHERE bed_number BETWEEN 'ER-35' AND 'ER-50';

-- Verify assignments
SELECT ward_name, COUNT(*) as bed_count 
FROM beds 
GROUP BY ward_name 
ORDER BY ward_name;
```

### Quick Setup Script

For convenience, use the provided setup script to assign all users and beds to Emergency Ward A:

```bash
# Option 1: Run the SQL script
psql -U postgres -d ewtcs -f scripts/setup-ward-assignments.sql

# Option 2: Quick one-liner (assigns everything to Ward A)
psql -U postgres -d ewtcs -c "UPDATE users SET ward_id = (SELECT id FROM wards WHERE code = 'EWA') WHERE role = 'nurse'; UPDATE beds SET ward_id = (SELECT id FROM wards WHERE code = 'EWA'), ward_name = 'Emergency Ward A' WHERE bed_number LIKE 'ER-%';"
```

**After running the setup:**
1. Refresh your browser
2. Right-click any bed to update its stage
3. Updates should work without permission errors

### Access Control Behavior

- **Nurses**: Can only view and update beds in their assigned ward
- **Supervisors**: Can access all wards
- **Admins**: Can access all wards
- **Audit Logging**: Unauthorized access attempts are logged in `audit_logs` table

### Creating Additional Wards

```sql
-- Add a new ward
INSERT INTO wards (name, code, description) 
VALUES ('Emergency Ward D', 'EWD', 'Emergency Ward Zone D');

-- Assign beds to new ward
UPDATE beds 
SET ward_id = (SELECT id FROM wards WHERE code = 'EWD'),
    ward_name = 'Emergency Ward D'
WHERE bed_number IN ('ER-51', 'ER-52', 'ER-53');
```

---

## Troubleshooting

### Problem: "createdb: error: connection refused"

**Cause:** PostgreSQL is not running

**Solution:**
```bash
# Windows
net start postgresql-x64-14

# macOS
brew services start postgresql@14

# Linux
sudo systemctl start postgresql
```

---

### Problem: "role 'postgres' does not exist"

**Cause:** PostgreSQL user not created

**Solution:**
```bash
# Create postgres user (as superuser)
createuser -s postgres
```

---

### Problem: "password authentication failed"

**Cause:** Wrong password in DATABASE_URL

**Solution:**
1. Check your PostgreSQL password
2. Update `.env.local` with correct password
3. If password has special characters, URL-encode them

---

### Problem: "database 'ewtcs' does not exist"

**Cause:** Database not created yet

**Solution:**
```bash
createdb ewtcs
```

---

### Problem: "relation 'users' does not exist"

**Cause:** Migrations not run

**Solution:**
```bash
npm run db:migrate
```

---

### Problem: "ENCRYPTION_KEY is required"

**Cause:** Using encrypted DATABASE_URL without encryption key

**Solution:**
In development, use plaintext DATABASE_URL:
```env
# Use this (plaintext)
DATABASE_URL=postgresql://postgres:password@localhost:5432/ewtcs

# NOT this (encrypted - only for production)
# DATABASE_URL_ENCRYPTED=ivhex:encryptedhex
```

---

### Problem: "admin user already exists"

**Cause:** Database already seeded

**Solution:** This is normal. If you need to reset:
```bash
# Reset entire database (WARNING: deletes all data)
npm run db:reset

# Then re-run migrations and seed
npm run db:migrate
npm run db:seed
```

---

### Problem: "Not run migration XXX is preceding already run migration YYY"

**Cause:** Migration numbering mismatch between database and filesystem (occurs after PR merges with conflicting migration numbers)

**Solution:** Run the migration reordering script:
```bash
psql -U postgres -d ewtcs -f scripts/fix-migration-order.sql
```

Then verify:
```bash
npm run db:status
npm run validate:migrations
```

**Background:** When team members create migrations with the same numbers in different branches, merging can cause the database to have migrations recorded under different names than the filesystem expects. The `fix-migration-order.sql` script synchronizes the pgmigrations table with the current filesystem state.

---

### Problem: "You do not have permission to update this bed" (Ward Access Control)

**Cause:** Ward assignments not configured (Migration 006 security feature)

**Explanation:** This is **expected behavior**, not a bug. Migration 006 added ward-level access control to prevent IDOR attacks. Nurses can only update beds in their assigned ward.

**Solution:** Assign wards to users and beds:
```bash
# Quick setup (assigns everything to Emergency Ward A)
psql -U postgres -d ewtcs -f scripts/setup-ward-assignments.sql

# Or manual assignment
psql -U postgres -d ewtcs
```

Then run:
```sql
-- Assign nurses to ward
UPDATE users SET ward_id = (SELECT id FROM wards WHERE code = 'EWA') WHERE role = 'nurse';

-- Assign beds to ward
UPDATE beds SET ward_id = (SELECT id FROM wards WHERE code = 'EWA'), ward_name = 'Emergency Ward A' WHERE bed_number LIKE 'ER-%';
```

**Security Note:** This error prevents unauthorized bed access. See [Ward Access Control Setup](#ward-access-control-setup) for details.

---

## Recent Schema Changes

| Migration | Description |
|---|---|
| `028_create_archival_tables` | EPIC 14 — archival tables for data retention (`audit_logs_archive`, `patient_admissions_archive`, `archival_runs`) |
| `029_seed_retention_settings` | EPIC 14 — default data retention policy settings in `system_settings` |
| `030_create_report_signoffs` | EPIC 12 — `report_signoffs` table for immutable supervisor sign-offs on daily reports |
| `031_archive_bed_stage_logs` | EPIC 3 — `bed_stage_logs_archive` table for historical stage-transition retention (>90 days) |
| `seed_config_jmch` | Updated JMCH hospital seed configuration with customized workflow stages |

---

## Migration Commands

### Available Commands

```bash
# Run all pending migrations
npm run db:migrate

# Check migration status
npm run db:status

# Rollback last migration
npm run db:rollback

# Create new migration
npm run db:create

# Seed database with initial data
npm run db:seed

# Reset database (WARNING: deletes all data)
npm run db:reset
```

### Creating New Migrations

```bash
# Generate migration file
npm run db:create your_migration_name

# Edit the generated file in migrations/
# migrations/00X_your_migration_name.sql

# Run the migration
npm run db:migrate
```

### Migration File Structure

```sql
-- Migration XXX: Description
-- Purpose: What this migration does

-- Create table
CREATE TABLE IF NOT EXISTS your_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    column_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_table_column ON your_table(column_name);

-- Insert default data (optional)
INSERT INTO your_table (column_name) VALUES ('default_value')
ON CONFLICT DO NOTHING;
```

---

## Testing Database Setup

### Manual Verification

```bash
# Connect to database
psql -U postgres -d ewtcs

# List all tables
\dt

# Check users table
SELECT username, role FROM users;

# Check stages
SELECT name, display_order FROM stages ORDER BY display_order;

# Check beds
SELECT bed_number, is_occupied FROM beds ORDER BY bed_number;

# Exit psql
\q
```

### Expected Table Count

Run `\dt` in psql — you should see **15 tables**:
- audit_logs
- bed_stage_log_corrections
- bed_stage_logs
- beds
- disposition_delay_reasons
- kiosk_sessions
- password_reset_tokens
- patient_admissions
- shifts
- stage_delay_thresholds
- stage_transitions
- stages
- system_settings
- token_blacklist
- users
- wards

---

## Production Database Setup

For production environments:

1. **Use encrypted credentials:**
   ```env
   DATABASE_URL_ENCRYPTED=ivhex:encryptedhex
   ENCRYPTION_KEY=your-32-byte-master-key
   NODE_ENV=production
   ```

2. **Enable SSL:**
   - Production DATABASE_URL should use SSL
   - Example: `postgresql://user:pass@host:5432/db?sslmode=require`

3. **Run migrations on production:**
   ```bash
   NODE_ENV=production npm run db:migrate
   ```

4. **Never seed production with test data:**
   - Do NOT run `npm run db:seed` on production
   - Create admin users manually with strong passwords

---

## Database Backup & Restore

### Backup Database

```bash
# Backup entire database
pg_dump -U postgres ewtcs > backup.sql

# Backup with compression
pg_dump -U postgres ewtcs | gzip > backup.sql.gz
```

### Restore Database

```bash
# Restore from backup
psql -U postgres ewtcs < backup.sql

# Restore from compressed backup
gunzip < backup.sql.gz | psql -U postgres ewtcs
```

---

## Next Steps

After database setup is complete:

1. ✅ Start development server: `npm run dev`
2. ✅ Log in with admin credentials
3. ✅ Explore the bed dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
4. ✅ Check user management: [http://localhost:3000/admin/users](http://localhost:3000/admin/users)
5. ✅ Review audit logs for security

---

## Additional Resources

- [CONFIGURATION.md](CONFIGURATION.md) - Environment variable reference
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines
- [README.md](README.md) - Project overview
- [migrations/](migrations/) - All migration files
- [scripts/](scripts/) - Database utility scripts

---

## Support

If you encounter issues not covered here:

1. Check [GitHub Issues](https://github.com/somuyakhandelwal/EWTCS/issues)
2. Review error logs in console
3. Verify PostgreSQL is running: `pg_isready`
4. Check DATABASE_URL format in `.env.local`
5. Create a new issue with error details

---

**Ready to build something amazing! 🚀**
 
## Triage Metadata
Triage metadata (patient UHID, name, key symptom, category) is stored in the `metadata` JSONB column on the `beds` table to avoid breaking schema changes.
