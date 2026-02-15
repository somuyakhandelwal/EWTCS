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

1. **Clone & install**
   ```bash
   git clone https://github.com/somuyakhandelwal/EWTCS.git
   cd EWTCS && npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit DATABASE_URL and NEXT_PUBLIC_APP_URL in .env.local
   ```

3. **Run database setup**
   ```bash
   # Create database
   createdb ewtcs
   
   # Run migrations (coming soon)
   npm run db:migrate
   # Seed initial data (coming soon)
   npm run db:seed
   npm run db:migrate  # Apply schema migrations
   npm run db:seed     # Seed initial data
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

We use a **feature-first hybrid architecture** for scalability and maintainability:

```
EWTCS/
├── src/
│   ├── app/              # Next.js App Router (routes only)
│   ├── features/         # Feature modules (business logic)
│   │   ├── auth/         # Authentication & authorization
│   │   └── user-management/  # User management (US-5.7)
│   └── shared/           # Shared code (reusable across features)
│       ├── components/ui/    # shadcn/ui components
│       ├── lib/             # Utilities (db, utils)
│       ├── config/          # App configuration
│       └── types/           # Shared TypeScript types
├── migrations/           # Database migrations (version-controlled)
├── scripts/              # Utility scripts (migrations, seeding, reset)
└── public/               # Static assets
```

**Architecture Guidelines:**
- **Features** - Self-contained business domains (auth, user-management, etc.)
- **Shared** - Code reused by 2+ features (UI components, utilities, config)
- **App** - Thin routing layer, minimal logic

See [Architecture Plan](reports/FEATURE-FIRST-ARCHITECTURE-PLAN.md) for details.

---

## 🎨 Bed Status Stages

The system tracks patients through 6 stages with color-coded indicators:

| Stage | Color | Description |
|-------|-------|-------------|
| **1. Patient Admitted** | 🟡 Yellow | Patient has arrived |
| **2. Under Assessment** | 🟠 Orange | Initial examination in progress |
| **3. Tests Ordered** | 🔵 Blue | Diagnostic tests requested |
| **4. Awaiting Results** | 🟣 Purple | Waiting for test results |
| **5. Decision Made** | 🟢 Green | Treatment plan decided |
| **6. Discharged/Transferred** | ⚪ Grey | Patient has left |
| **⚠️ Time > 3 hours** | 🔴 Red | Automatic alert for delays |

---

## 🔧 Available Commands

### Development
```bash
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

- **[PRD.md](PRD.md)** - Complete Product Requirements Document
- **[CONFIGURATION.md](CONFIGURATION.md)** - Detailed environment setup, migrations, and deployment
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines and coding standards
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** - Community guidelines
- **[Architecture Plan](reports/FEATURE-FIRST-ARCHITECTURE-PLAN.md)** - Feature-first hybrid architecture design
- **[Features Guide](src/features/README.md)** - How to structure new features
- **[Shared Code Guide](src/shared/README.md)** - Guidelines for shared code

---

## 🗺️ Roadmap

### Phase 1: Foundation & Core Features
- [x] Database schema design
- [x] Automated migrations
- [x] Feature-first hybrid architecture
- [x] Authentication & authorization system (EPIC 5)
- [x] Role-based access control (Admin, Supervisor, Nurse)
- [x] User management system (US-5.7)
- [ ] Bed status grid component
- [ ] One-click stage updates
- [ ] Color-coded visual indicators
- [ ] Automatic time tracking

### Phase 2: Analytics
- [ ] Daily AI summary generator
- [ ] Management dashboard
- [ ] Performance metrics
- [ ] Exportable reports (PDF/CSV)

### Phase 3: Advanced Features
- [ ] Lab/Radiology integration
- [ ] Mobile app for doctors
- [ ] Predictive analytics
- [ ] Multi-department support

---
Phase 1 Complete**

**✅ Completed (Phase 1):**
- Repository & Next.js 15.5 setup
- PostgreSQL database schema & automated migrations
- Feature-first hybrid architecture implementation
- Environment configuration & validation with encryption support
- Health check endpoint
- **Authentication & Session Management (EPIC 5)**
  - Secure login/logout with bcrypt password hashing
  - Role-based access control (Admin, Supervisor, Nurse)
  - Session management with encrypted cookies
- **User Management System (US-5.7)**
  - Create, update, activate/deactivate users
  - Admin dashboard with user table
  - Audit logging for all user actions
  - Complete CRUD operations with input validation

**🔄 In Progress (Phase 2):**
- Bed status grid UI component
- One-click stage updates
- Automatic time tracking per patient

**⏳ Pending (Phase 3+):**
- Daily reports & AI summaries
- Performance analytics dashboard
- Lab/Radiology integration
**Pending:**
- ⏳ Daily reports & AI summaries
- ⏳ Management dashboards

---

## 🤝 Contributing

Use the provided templates for each environment:

- .env.example (general template)
- .env.development
- .env.staging
- .env.production

Create a `.env.local` file in the root directory:

```env
# Database (plaintext allowed in dev/staging)
DATABASE_URL=postgresql://username:password@localhost:5432/ewtcs
We welcome contributions! This is a healthcare project that can make a real difference.

### Quick Start for Contributors

1. **Feature-first structure for new features (see [src/features/README.md](src/features/README.md))
- ✅ Maximum 200 lines per file (enforced by CI)
- ✅ Functional components with hooks
- ✅ Tailwind CSS via shadcn/ui (in `shared/components/ui/`)
- ✅ Path aliases: Use `@/features/*`, `@/shared/*`, `@/app/*`heckout -b feature/issue-<id>-description`
3. **Make your changes** following our coding standards
4. **Test locally**: `npm run dev`
5. **Commit**: `git commit -m "feat: add feature description"`
6. **Push**: `git push origin feature/issue-<id>-description`
7. **Submit a Pull Request**

### Coding Standards

- ✅ TypeScript required for all new code
- ✅ Functional components with hooks
- ✅ Tailwind CSS via shadcn/ui
- ✅ Descriptive, meaningful names
- ✅ Documentation for complex logic
- ✅ Tests for new features (when test suite is available)

# Environment
NODE_ENV=development
# Security (Required)
SESSION_SECRET=your_super_secret_key_at_least_32_chars_long

# AI/Analytics (Optional - for future use)
# OPENAI_API_KEY=your_api_key_here
```


### Branch Naming Convention

```
feature/issue-<id>-short-description
bugfix/issue-<id>-short-description
docs/issue-<id>-short-description
```

For complete guidelines: See [CONTRIBUTING.md](CONTRIBUTING.md)

For production, use encrypted secrets instead of plaintext values:

```env
DATABASE_URL_ENCRYPTED=ivhex:encryptedhex
ENCRYPTION_KEY=your-32-byte-master-key
```

See CONFIGURATION.md for full details.

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
- **Contributors** - Thank you to everyone who contributes
**Star ⭐ this repository if you find it useful!**

---

## 🏗️ Architecture Highlights

This project uses a **feature-first hybrid architecture** designed for:
- **Scalability** - Easy to add new features without conflicts
- **Maintainability** - Clear separation of concerns
- **Team Collaboration** - Multiple developers can work on different features
- **Code Reusability** - Shared components and utilities

Each feature is self-contained with its own actions, components, and business logic, while shared code provides common UI components and utilities used across features.

Learn more: [Architecture Documentation](reports/FEATURE-FIRST-ARCHITECTURE-PLAN.md)
- ✅ Next.js project initialized
- ✅ Database client configured
- 🔄 Database schema in progress
- 🔄 UI components in progress
- ✅ Authentication system
- ✅ Dashboard (Nurse View)
- [ ] Bed status grid component
- [ ] One-click stage updates
- [ ] Color-coded visual indicators
- [ ] Automatic time tracking

---

**Star ⭐ this repository if you find it useful!**
