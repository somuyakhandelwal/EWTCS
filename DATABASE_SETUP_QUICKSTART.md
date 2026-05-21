# Database Setup — Quick Start & Detailed Setup

> **Navigation:** [Index](DATABASE_SETUP.md) | Quick Start | [Schema](DATABASE_SETUP_SCHEMA.md) | [Settings & Indexes](DATABASE_SETUP_SETTINGS_INDEXES.md) | [Ward Access](DATABASE_SETUP_WARD_ACCESS.md) | [Troubleshooting](DATABASE_SETUP_TROUBLESHOOTING.md) | [Migrations & Testing](DATABASE_SETUP_MIGRATIONS.md)

Complete guide for setting up the EWTCS PostgreSQL database for local development.

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
- ✅ `offline_queue` table (durable offline action queue for reconnect sync)

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
- ✅ 30 Emergency Ward beds (`ER-01` to `ER-30`)
- ✅ 6 Triage Area beds (`TRIAGE-01` to `TRIAGE-06`)
- ✅ 16 Operation Theatre rooms (`OT-01` to `OT-16`)

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

> **Next:** See [Database Schema](DATABASE_SETUP_SCHEMA.md) for table definitions, or [Troubleshooting](DATABASE_SETUP_TROUBLESHOOTING.md) if you hit errors.
