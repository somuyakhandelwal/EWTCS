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
| `users` | Authentication & user management | id, username, role, password_hash |
| `audit_logs` | Security & compliance logging | id, action_type, performed_by, timestamp |
| `stages` | Patient workflow stages | id, name, display_order, color_code |
| `beds` | Emergency ward beds | id, bed_number, current_stage_id, is_occupied |
| `bed_stage_logs` | Bed transition history | id, bed_id, from_stage_id, to_stage_id |

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

### Relationships

```
users (1) ──< (many) audit_logs
users (1) ──< (many) bed_stage_logs
stages (1) ──< (many) beds
stages (1) ──< (many) bed_stage_logs
beds (1) ──< (many) bed_stage_logs
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

Run `\dt` in psql - you should see **5 tables**:
- audit_logs
- bed_stage_logs
- beds
- stages
- users

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
