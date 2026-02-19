# Emergency Ward Bed Status Monitoring & AI Daily Report System (EWTCS)

> A real-time digital dashboard for hospital emergency ward management that enables nurses to track bed status with one-click updates, automatic time tracking, and AI-generated daily performance reports.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Problem & Solution

**The Problem:**
Emergency wards lack real-time visibility into patient progress. Manual tracking, no operational intelligence, and no automated reporting lead to delays and poor accountability.

- ✅ Color-coded visual alerts
- ✅ AI-generated daily summaries
### For Nurses
- **Visual Dashboard**: Color-coded grid showing all emergency beds
- **No Typing Required**: Simple, intuitive interface

### For Supervisors
### For Management
- **Daily AI Reports**: Automated performance summaries
---

- **[Next.js 15.5](https://nextjs.org/)** - React framework with App Router
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful, accessible components
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
**Our Solution:**
A simple, intuitive dashboard that provides:
- ✅ Real-time bed status visibility
- ✅ One-click status updates (no typing)
- ✅ Automatic time tracking per patient
- ✅ Color-coded visual alerts
- ✅ Automated daily performance reports

**For Nurses:** Visual dashboard with color-coded beds and simple buttons  
**For Supervisors:** Monitor delayed beds and enforce compliance  
**For Management:** Daily AI-powered summaries and performance metrics  

---

## 🎯 Project Goals

1. **Reduce patient wait times** by improving visibility
2. **Increase accountability** through automatic tracking
3. **Enable data-driven decisions** with AI-powered insights
4. **Improve emergency ward efficiency** without disrupting existing workflows

---

## 🔧 Technology Stack

### Frontend
- **Next.js 15.5** - React framework with App Router
- **shadcn/ui** - Beautiful, accessible components
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Static type checking

### Backend
- **Next.js API Routes** - RESTful endpoints
- **Server Actions** - Server-side mutations
- **ESLint** - Code linting

### Database & Infrastructure
- **PostgreSQL 14+** - Relational database
- **node-pg-migrate** - Version-controlled schema migrations
- **Automated migrations** - Deploy-time schema updates

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- npm/yarn/pnpm

### Installation

#### Quick Start (Recommended for New Developers)

Run our automated setup script:

```bash
git clone https://github.com/somuyakhandelwal/EWTCS.git
cd EWTCS
npm install
npm run setup
```

The setup script will:
✅ Check prerequisites (Node.js, PostgreSQL)
✅ Create database
✅ Configure environment variables (.env.local)
✅ Run migrations
✅ Seed initial data
✅ Provide next steps

**Default Credentials After Setup:**
- Username: `admin1`
- Password: `Nurse@123`
- Other users: `nurse`, `nurse1`, `supervisor1` (same password)
- **Note:** These are created by `npm run db:seed` which runs `scripts/seed-db.js`

---

#### Manual Setup (For Experienced Developers)

1. **Clone & install dependencies**
   ```bash
   git clone https://github.com/somuyakhandelwal/EWTCS.git
   cd EWTCS
   npm install
   ```

2. **Install & start PostgreSQL**
   - Windows: [Download PostgreSQL](https://www.postgresql.org/download/windows/)
   - macOS: `brew install postgresql@14 && brew services start postgresql@14`
   - Linux: `sudo apt install postgresql-14 && sudo systemctl start postgresql`

3. **Create database**
   ```bash
   # Using createdb command (recommended)
   createdb ewtcs
   
   # OR using psql
   psql -U postgres -c "CREATE DATABASE ewtcs;"
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database credentials
   ```

   **Required variables in `.env.local`:**
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ewtcs
   SESSION_SECRET=your-random-secret-min-32-characters-long
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NODE_ENV=development
   RED_ALERT_THRESHOLD_MS=10800000
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

6. **Seed initial data**
   ```bash
   npm run db:seed        # Creates user accounts (admin1, nurse, nurse1, supervisor1)
   npm run seed:config    # Creates emergency ward beds (ER-01 to ER-50) and patient workflow stages
   ```
   
   **User accounts created by `npm run db:seed`:**
   - `admin1` - Administrator account
   - `nurse` - Nurse account
   - `nurse1` - Nurse account
   - `supervisor1` - Supervisor account
   
   All users have password: `Nurse@123`

7. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and login with `admin1`/`Nurse@123`

8. **Running Tests** (Optional)
   ```bash
   npm test                  # Run all tests once
   npm run test:watch       # Run tests in watch mode (auto-rerun on file changes)
   npm run test:coverage    # Generate coverage report
   ```

   Tests are located in `src/features/bed-dashboard/__tests__/`

---

#### Troubleshooting Setup

**Problem: "createdb: error: connection refused"**
- PostgreSQL is not running
- Solution: Start PostgreSQL (see step 2 above)

**Problem: "password authentication failed"**
- Wrong credentials in DATABASE_URL
- Solution: Check your PostgreSQL password and update .env.local

**Problem: "relation 'users' does not exist"**
- Migrations not run
- Solution: `npm run db:migrate`

**For complete troubleshooting guide:** See [DATABASE_SETUP.md](DATABASE_SETUP.md)

---

## 📁 Project Structure

We use a **feature-first architecture** for scalability and maintainability:

```
EWTCS/
├── src/
│   ├── app/                     # Next.js App Router (routes & pages)
│   │   ├── (auth)/             # Auth-protected routes
│   │   ├── admin/              # Admin dashboard
│   │   ├── analytics/          # Analytics pages
│   │   ├── dashboard/          # Main dashboard
│   │   ├── login/              # Login page
│   │   └── supervisor/         # Supervisor pages
│   ├── features/                # Feature modules (self-contained)
│   │   ├── auth/               # Authentication & authorization
│   │   ├── bed-dashboard/      # Bed management & analytics
│   │   └── user-management/    # User CRUD operations
│   └── shared/                  # Shared code (utilities, UI components)
│       ├── components/ui/      # Reusable UI components (shadcn/ui)
│       ├── lib/                # Utilities (database, auth, validation)
│       ├── config/             # Configuration (logger, constants)
│       └── types/              # Shared TypeScript types
├── migrations/                  # Database migrations (versioned)
├── scripts/                     # Utility scripts (setup, seed, migrate)
├── docs/                        # Documentation and archives
└── public/                      # Static assets

```

**Architecture Principles:**
- **Features** - Self-contained business logic (auth, bed-dashboard, etc.)
- **Shared** - Reusable code (UI components, utilities, types)
- **App** - Routing layer with minimal logic
- **Max 200 lines per file** - Enforced for maintainability

---

## 🎨 Bed Status Stages

The system tracks patients through 8 workflow stages with color-coded indicators:

| Stage | Color | Description |
|-------|-------|-------------|
| **Empty** | ⚪ Gray | Bed is available and ready for next patient |
| **Triage** | 🔵 Blue | Patient initial assessment and prioritization |
| **Registration** | 🟦 Cyan | Patient registration and documentation |
| **Doctor Assessment** | 🟡 Yellow | Doctor examining patient and ordering tests |
| **Treatment/Observation** | 🟠 Orange | Patient receiving treatment or under observation |
| **Decision Made** | 🟢 Green | Discharge decision made or admission arranged |
| **Discharge Process** | 🟣 Purple | Patient being discharged or transferred |
| **Cleaning** | 🟤 Pink | Bed being cleaned and prepared for next patient |
| **⚠️ DELAYED** | 🔴 Red | Any stage >3 hours triggers automatic alert |

**Stage Transitions:**
- Forward progression through stages is allowed
- Skip ahead allowed (e.g., Triage → Treatment)
- Backward transitions require supervisor override
- All transitions are logged with timestamps for analytics

---

## 🔧 Available Commands

### Setup & Development
```bash
npm run setup        # 🚀 Automated setup wizard (recommended for new developers)
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server (runs migrations automatically)
npm run lint         # Run ESLint
```

### Database Management
```bash
npm run db:migrate   # Apply pending migrations with single transaction
npm run db:rollback  # Revert the last migration
npm run db:status    # Show applied and pending migrations
npm run db:create    # Create a new timestamped migration file
npm run db:seed      # Seed initial test data
npm run db:reset     # Drop and recreate schema (development only)
```

**New to the project?** Run `npm run setup` for automated database setup!

Migration details and best practices: See [CONFIGURATION.md#migrations](CONFIGURATION.md#migrations)

---

## 🌐 Configuration

### Environment Variables (Quick Setup)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ewtcs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### For Production
Use encrypted secrets via `DATABASE_URL_ENCRYPTED` and `ENCRYPTION_KEY`.

Full environment variable reference: See [CONFIGURATION.md](CONFIGURATION.md)

---

## 📚 Documentation

### Quick Links

- **[QUICKSTART.md](QUICKSTART.md)** ⚡ - Get running in 5 minutes
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** 📊 - Current status, features, and roadmap
- **[docs/README.md](docs/README.md)** 📑 - Complete documentation index

### Start Here

- **[DATABASE_SETUP.md](DATABASE_SETUP.md)** - Complete database setup guide (PostgreSQL, migrations, seeding)
- **[CONFIGURATION.md](CONFIGURATION.md)** - Environment variables, deployment, and production setup
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute (coding standards, branch naming, PR process)
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** - Community guidelines and standards

### Technical Documentation

- **[Features Guide](src/features/README.md)** - How to structure and build new features
- **[Shared Code Guide](src/shared/README.md)** - Guidelines for shared utilities and components
- **[Analytics Documentation](src/features/bed-dashboard/ANALYTICS_README.md)** - Stage analytics and reporting system

### Reference Documentation

- **[PRD & User Stories](docs/archive/)** - Product requirements and detailed user stories (archived)

---

## 🗺️ Roadmap

### ✅ Phase 1: Foundation & Core Features (COMPLETED)

**Authentication & User Management:**
- [x] Database schema with automated migrations
- [x] Feature-first architecture implementation
- [x] Authentication system with bcrypt password hashing
- [x] Role-based access control (Admin, Supervisor, Nurse)
- [x] Complete user management system with CRUD operations
- [x] Audit logging for all user actions

**Bed Management & Tracking:**
- [x] Bed status dashboard with grid layout (20 beds)
- [x] 8-stage patient workflow (Empty → Triage → Registration → Doctor Assessment → Treatment → Decision → Discharge → Cleaning)
- [x] Color-coded visual indicators for each stage
- [x] Automatic patient entry time capture (server-side)
- [x] Real-time elapsed time tracking
- [x] Automatic delay detection (>3 hours) with visual alerts
- [x] One-click stage updates with validation
- [x] Filter functionality (Show Delayed Only)
- [x] Stage transition validation and corrections system

**Analytics & Reporting:**
- [x] Comprehensive stage analytics system
- [x] Time tracking for all stage transitions (US-3.2)
- [x] Immutable audit logs with correction trail
- [x] Statistical analysis (avg, median, percentiles)
- [x] Bed timeline visualization
- [x] CSV export functionality for analysts
- [x] Performance-optimized queries with indexes

### 🔄 Phase 2: Real-Time Updates & Advanced Features (PARTIALLY COMPLETE)

- [x] Real-time updates with intelligent polling (US-1.2)
- [x] Search by bed number and stage name with highlighting (US-1.2)
- [x] Connection status indicator with auto-reconnect
- [x] Disposition bottleneck tracking with delay reasons (US-1.6, US-17)
- [x] Bed history modal with full stage transition log
- [x] Admin pages for bed and stage management (US-6.1)
- [x] Stage color configuration (EPIC 4)
- [ ] Push notifications for delayed beds
- [ ] Enhanced mobile responsiveness
- [ ] Batch operations for multiple beds

### ⏳ Phase 3: AI & Reporting (PLANNED)

- [ ] Daily AI summary reports generator
- [ ] Management dashboard with KPIs
- [ ] Predictive analytics for bed allocation
- [ ] Automated performance reports (PDF/CSV)
- [ ] Historical trend analysis
- [ ] Bottleneck identification algorithms

### 🚀 Phase 4: Integration & Expansion (FUTURE)

- [ ] Lab/Radiology system integration
- [ ] Mobile app for doctors and nurses
- [ ] Multi-ward/department support
- [ ] Patient transfer workflows
- [ ] EMR/EHR integration capabilities

---

## 🤝 Contributing

We welcome contributions! This project can make a real difference in healthcare.

### Quick Start for Contributors

1. **Fork & clone**: `git clone https://github.com/YourUsername/EWTCS.git`
2. **Install**: `npm install`
3. **Setup database**: `npm run setup` (automated wizard)
4. **Create branch**: `git checkout -b feature/issue-<id>-description`
5. **Make changes** following our coding standards (see below)
6. **Test locally**: `npm run dev` and verify changes
7. **Commit**: `git commit -m "feat: add feature description"`
8. **Push**: `git push origin feature/issue-<id>-description`
9. **Submit Pull Request** with clear description

### Coding Standards

- ✅ TypeScript required for all new code
- ✅ Feature-first structure (see [src/features/README.md](src/features/README.md))
- ✅ Maximum 200 lines per file
- ✅ Functional components with hooks
- ✅ Tailwind CSS via shadcn/ui
- ✅ Path aliases: `@/features/*`, `@/shared/*`, `@/app/*`
- ✅ Descriptive variable and function names
- ✅ Documentation for complex logic

### Branch Naming Convention

```
feature/issue-123-add-notification-system
bugfix/issue-456-fix-login-timeout
docs/issue-789-update-readme
```

For complete guidelines: See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 🐛 Bug Reports & Feature Requests

Found a bug or have an idea?

1. Check [existing issues](https://github.com/somuyakhandelwal/EWTCS/issues)
2. Create a [new issue](https://github.com/somuyakhandelwal/EWTCS/issues/new)
3. Use the issue template
4. Provide clear steps to reproduce or detailed context

---

## 📞 Support & Discussion

- **Issues**: [GitHub Issues](https://github.com/somuyakhandelwal/EWTCS/issues) - Bug reports and feature requests
- **Discussions**: [GitHub Discussions](https://github.com/somuyakhandelwal/EWTCS/discussions) - Questions and ideas
- **Email**: [somuyakhandelwal@gmail.com](mailto:somuyakhandelwal@gmail.com)

---

## 🙏 Acknowledgments

- **JMCH Medical College & Hospital** - For the opportunity to improve emergency ward efficiency
- **Contributors** - Thank you to everyone who contributes code, documentation, and feedback
- **Open Source Community** - For the amazing tools and libraries that power this project

---

## 🏗️ Architecture & Tech Stack Highlights

### Feature-First Architecture
This project uses a **feature-first architecture** designed for:
- **Scalability** - Easy to add new features independently
- **Maintainability** - Clear separation of concerns, max 200 lines per file
- **Team Collaboration** - Multiple developers work on different features simultaneously
- **Code Reusability** - Shared UI components and utilities across features

### Key Technologies
- **Next.js 15.5** - Server-side rendering, API routes, and modern React features
- **TypeScript** - Type safety and better developer experience
- **PostgreSQL** - Reliable relational database with ACID compliance
- **shadcn/ui + Tailwind CSS** - Beautiful, accessible UI components
- **Feature Modules** - Self-contained business logic with clear boundaries

### Security & Performance
- **Bcrypt password hashing** - Industry-standard secure authentication
- **Role-based access control** - Fine-grained permissions (Admin/Supervisor/Nurse)
- **Audit logging** - Complete trail of all user actions
- **Optimized queries** - Database indexes for analytics performance
- **Immutable logs** - Stage transitions cannot be deleted, only corrected

**Learn more:** [Features Guide](src/features/README.md) | [Shared Code Guide](src/shared/README.md)

---

**⭐ Star this repository if you find it useful!**
