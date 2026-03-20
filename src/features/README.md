# Features Directory

This directory contains all feature modules organized by business domain. Each feature is self-contained with its own components, actions, business logic, schemas, and types.

## Structure

Each feature follows this structure:

```
feature-name/
├── components/        # Feature-specific UI components
├── actions/           # Server actions for this feature
├── lib/               # Business logic, queries, mutations
├── schemas/           # Zod validation schemas
├── hooks/             # React hooks specific to this feature
└── types/             # TypeScript types for this feature
```

## Current Features

### `auth/`
**EPIC 5: Authentication & Role-Based Access**
- User authentication and session management
- Login/logout functionality
- JWT session handling
- Permission verification

### `user-management/`
**EPIC 5: User Management (Admin)**
- Admin user CRUD operations
- User table and dialogs
- Audit logging
- Role management

### `bed-dashboard/`
**EPIC 1-4: Bed Dashboard & Time Tracking**
- Real-time bed status grid with polling
- Color-coded bed states and stage updates
- Auto-refresh with connection status
- Stage transition history and timestamps
- Duration calculations and stage logs
- Visual alerts and color configuration

### `analytics/`
**EPIC 7: Disposition Bottleneck & TAT Analytics**
- Disposition bottleneck tracking
- Waiting time analytics
- Turnaround time (TAT) analysis
- Delay reason attribution (US-17)
- CSV export for analysis

### `audit-mode/`
**EPIC 12: Audit Role & Compliance (NEW) ✅**
- Auditor read-only role with full data access
- All action buttons disabled in audit mode
- Audit logging with immutable records
- Audit mode indicator banner
- Read-only auditor history with filtering, sorting, pagination
- Comprehensive audit trail with IP tracking and timestamps

### `ai-summary/`
**EPIC 9: Daily AI Summary Generator ✅**
- Daily bed statistics aggregation (patients, stage time, delays, TAT)
- AI narrative (200-300 words) + structured insights with confidence (US-9.1, US-9.3)
- Draft → Review → Approve/Reject workflow (US-9.2)
- Idempotent upsert into `daily_summaries` table
- Server actions: `generateDailySummary`, `fetchDailySummaryByDate`, `fetchRecentDailySummaries`, `approveSummary`, `rejectSummary`, `updateSummaryDraftAction`, `flagInsightAction`
- API route: `POST /api/daily-summary/generate`, `GET /api/daily-summary/generate`
- Midnight auto-run via GitHub Actions cron (18:30 UTC = 00:00 IST)
- Manual trigger: `npm run cron:summary`

### `notifications/`
**EPIC 15: Notifications & Alerts (US-15.5) ✅**
- Per-user alert preference configuration for supervisors/admins
- Enable/disable alert types (delayed, escalation, bottleneck, system errors)
- User-defined alert thresholds with validation
- Reset-to-default workflow
- Preference-aware supervisor alert visibility

### `security-scanning/`
**EPIC 17: Security & Privacy (Automated Vulnerability Scanning) ✅**
- Automated weekly vulnerability scanning with npm audit
- Weekly schedule (Monday 00:00 UTC) + on-demand + PR integration
- SLA tracking with deadline calculation per severity:
  - Critical: 48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: 90 days
- Breach detection and escalation levels (none/warning/critical)
- Slack & email notifications for vulnerability alerts
- GitHub issue creation for critical vulnerabilities
- PR comments with scan results and blocking on critical vulns
- Historical scan archival (90-day artifacts + git history)
- Dependabot integration for automated dependency updates
- Multi-format reporting (Markdown, HTML, JSON)
- Admin-only server actions with audit logging
- React hooks for client-side report integration
- UI components for vulnerability and SLA status display
- See: `docs/SECURITY_SCANNING.md` and `docs/SECURITY_TEAM_RUNBOOK.md`

### `cath-lab/`
**EPIC 24: Cath Lab Module (US-24.1) ✅**
- Dedicated cardiology procedure logging workflow
- Procedure type support for `CAG` and `PTCA`
- Procedure fields: patient ID, cardiologist, start/end time, and outcome
- Validation + audit trail integration for new procedure logs
- Distinct route and workflow from OT module (`/cath-lab`)

## Future Features

Based on EPICS.md, upcoming features may include:

### `shift-management/`
**EPIC 8: Shift Management**
- Shift tracking
- Staff assignment
- Analytics

### `ai-summary/`
**EPIC 9: Daily AI Summary Generator** *(planned — Phase 3)*
- Remaining: AI model integration, report formatting, PDF/email export

## Adding a New Feature

1. Create the feature directory structure:
   ```bash
   mkdir -p src/features/[feature-name]/{components,actions,lib,schemas,hooks,types}
   ```

2. Add feature code following the co-location principle

3. Export public API from feature's index files

4. Import using the feature alias:
   ```typescript
   import { Component } from '@/features/[feature-name]/components/...'
   ```

5. Update this README with the new feature

## Guidelines

- ✅ Keep features self-contained
- ✅ Co-locate related code
- ✅ Use clear naming conventions
- ✅ Document complex features
- ✅ Export clean public APIs
- ❌ Don't create circular dependencies between features
- ❌ Don't import from another feature's internals
- ❌ Don't mix shared code into features (use `/shared` instead)
