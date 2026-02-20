# Documentation Index

This document provides a quick reference to all available documentation.

## 🚀 Getting Started

Start here if you're new to the project:

1. **[README.md](../README.md)** - Project overview, features, and technology stack
2. **[QUICKSTART.md](../QUICKSTART.md)** - Get running in 5 minutes (recommended for beginners)
3. **[DATABASE_SETUP.md](../DATABASE_SETUP.md)** - Complete database setup guide

## 📚 Core Documentation

### Setup & Configuration
- **[DATABASE_SETUP.md](../DATABASE_SETUP.md)** - PostgreSQL installation, database creation, migrations
- **[CONFIGURATION.md](../CONFIGURATION.md)** - Environment variables, deployment, production setup
- **[.env.example](../.env.example)** - Environment variable template with detailed comments
- **Audit Logging & Compliance** - See `CONFIGURATION.md` section "Audit Logging & Compliance" for immutable audit trail details

### Development
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - How to contribute (coding standards, workflow, PR process)
- **[CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)** - Community guidelines and standards
- **[Features Guide](../src/features/README.md)** - Feature-first architecture and how to build features
- **[Shared Code Guide](../src/shared/README.md)** - Guidelines for shared utilities and components
- **[Stage Color Map](../src/shared/utils/stage-colors.ts)** - Shared color classes used across the application
- **[Accessibility Checklist](ACCESSIBILITY.md)** - WCAG 2.1 AA contrast checks and guidance

### Technical Documentation
- **[Analytics System](../src/features/bed-dashboard/ANALYTICS_README.md)** - Stage analytics and reporting documentation
- **[Autosave Reliability (EPIC 13)](AUTOSAVE_RELIABILITY_EPIC13.md)** - Acceptance-criteria traceability for autosave, retry, alerts, and test coverage
- **[EPIC 13 Verification Checklist](EPIC13_VERIFICATION_CHECKLIST.md)** - Manual, staging, and release handoff checklist for autosave reliability
- **Auditor Bed History (EPIC 12)** - Read-only stage transition history with filtering, sorting, pagination, and CSV export in [AuditorHistoryView](../src/features/bed-dashboard/components/AuditorHistoryView.tsx)
- **Auditor Read-Only Enforcement (EPIC 12)** - Centralized write guard for auditor role in [auth.ts](../src/shared/lib/auth.ts) (`requireWriteRole` / `requireAdminWrite`) with deny logging, analytics audit-mode banner, and full read-only analytics exploration controls
- **[PROJECT_STATUS.md](../PROJECT_STATUS.md)** - Current project status, completed features, roadmap

## 📁 Archived Documentation

Historical requirements and design documents (for reference only):

- **[archive/PRD.md](archive/PRD.md)** - Original Product Requirements Document
- **[archive/USER_STORIES.md](archive/USER_STORIES.md)** - Detailed user stories with acceptance criteria

## 🎓 Learning Path

### For New Developers
1. Read [README.md](../README.md) - Understand what the project does
2. Follow [QUICKSTART.md](../QUICKSTART.md) - Get your environment running
3. Read [DATABASE_SETUP.md](../DATABASE_SETUP.md) - Understand the database
4. Review [CONTRIBUTING.md](../CONTRIBUTING.md) - Learn the development workflow
5. Study [Features Guide](../src/features/README.md) - Learn the architecture

### For System Administrators
1. Read [README.md](../README.md) - Project overview
2. Review [DATABASE_SETUP.md](../DATABASE_SETUP.md) - Database requirements
3. Study [CONFIGURATION.md](../CONFIGURATION.md) - Deployment and production setup
4. Check [.env.example](../.env.example) - Environment configuration

### For Data Analysts
1. Read [README.md](../README.md) - System overview
2. Review [Analytics Documentation](../src/features/bed-dashboard/ANALYTICS_README.md) - Analytics features
3. Check [PROJECT_STATUS.md](../PROJECT_STATUS.md) - Current capabilities

## 🔍 Quick Reference

| Task | Documentation |
|------|---------------|
| Install the system | [QUICKSTART.md](../QUICKSTART.md) |
| Set up database | [DATABASE_SETUP.md](../DATABASE_SETUP.md) |
| Configure environment | [CONFIGURATION.md](../CONFIGURATION.md) & [.env.example](../.env.example) |
| Contribute code | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Build a new feature | [Features Guide](../src/features/README.md) |
| Use analytics | [Analytics Documentation](../src/features/bed-dashboard/ANALYTICS_README.md) |
| Check project status | [PROJECT_STATUS.md](../PROJECT_STATUS.md) |
| Report a bug | [GitHub Issues](https://github.com/somuyakhandelwal/EWTCS/issues) |

## 📖 Document Descriptions

### README.md
Main project documentation covering:
- Problem statement and solution
- Technology stack
- Installation instructions
- Project structure
- Available commands
- Roadmap

### QUICKSTART.md
Fast-track setup guide:
- 5-minute installation
- Automated setup wizard
- Common troubleshooting
- Default credentials

### DATABASE_SETUP.md
Comprehensive database guide:
- PostgreSQL installation
- Database creation
- Migration management
- Seeding data
- Troubleshooting database issues

### CONFIGURATION.md
Environment and deployment:
- Environment variables explained
- Development vs production setup
- Encrypted secrets
- Deployment strategies

### CONTRIBUTING.md
Developer guidelines:
- Coding standards
- Branch naming conventions
- Pull request process
- Feature development workflow

### PROJECT_STATUS.md
Current state overview:
- Completed features
- In-progress work
- Planned features
- System statistics
- Known issues

## 🆘 Getting Help

- **Questions:** [GitHub Discussions](https://github.com/somuyakhandelwal/EWTCS/discussions)
- **Bug Reports:** [GitHub Issues](https://github.com/somuyakhandelwal/EWTCS/issues)
- **Email:** somuyakhandelwal@gmail.com

---

**Last Updated:** February 20, 2026
