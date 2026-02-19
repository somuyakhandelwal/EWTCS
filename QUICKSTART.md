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

# Database
npm run db:migrate       # Apply migrations
npm run db:rollback      # Revert last migration
npm run db:seed          # Add test data
npm run db:status        # Check migration status
npm run db:reset         # Reset database (dev only)

# Validation
npm run validate:env     # Check environment variables
npm run validate:db      # Check database connection
npm run validate:schema  # Verify database schema
npm run validate:all     # Run all validations
```

---

## Support

- **Documentation**: See [README.md](README.md)
- **Issues**: [GitHub Issues](https://github.com/somuyakhandelwal/EWTCS/issues)
- **Email**: somuyakhandelwal@gmail.com

---

**Ready to start?** Run `npm run setup` now!
