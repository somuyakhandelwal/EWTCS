# EWTCS Admin Handbook

Administrator runbook for configuration, maintenance, backup/recovery, security, and operations.

## Document Control
- Owner: Platform / System Administration
- Scope: Configuration, backups, troubleshooting, security, command references
- Versioning: Git-tracked; update required in release PRs when operations change
- Last Updated: 2026-03-18

## 1) System Overview
EWTCS is a Next.js + PostgreSQL emergency-ward operations platform.

- Routes/API: `src/app`
- Feature logic: `src/features/*`
- Shared runtime: `src/shared/*`
- Roles: `admin`, `supervisor`, `nurse`, `housekeeping`, `auditor`
- Key controls: env validation, `/api/health`, HTTPS enforcement, immutable `audit_logs`, archival jobs

### User and Role Management
- User admin surfaces: `/admin`, `src/features/user-management/*`
- Route-level role access: `src/middleware.ts`
- Auditor is read-only and blocked from write operations by server-side guards
- Operational policy: least-privilege role assignment, prefer deactivation over deletion, verify privileged changes in `audit_logs`

## 2) Configuration Management

### Required Variables
- `DATABASE_URL` or `DATABASE_URL_ENCRYPTED`
- `SESSION_SECRET` (min 32 chars)
- `NEXT_PUBLIC_APP_URL`
- `NODE_ENV` (`development`, `staging`, `production`)

### Important Optional Variables
- `ENCRYPTION_KEY` (required for encrypted secrets)
- `FORCE_HTTPS`, `HSTS_PRELOAD`
- `RED_ALERT_THRESHOLD_MS`
- `CRON_SECRET` (required for `/api/cron/archival`)

### Validation Workflow
```bash
npm run validate:env
npm run validate:db
npm run validate:migrations
npm run validate:schema
npm run validate:all
```

### Runtime Health & System Metrics
- Probe: `GET /api/health`
- Healthy: HTTP `200` + `status: healthy`
- Degraded: HTTP `503` + `status: degraded`

The `/api/health` endpoint additionally returns system-level metrics (Epic 13):
- **Infrastructure Metrics**: CPU usage (warn > 80%), Memory usage (warn > 80%), Disk usage (warn > 90%)
- **Load Metrics**: Request rate (per minute), Active users count
- **Database Status**: Reachability, Connection pool utilization (total, idle, waiting, max)
These metrics are surfaced live on the Admin Dashboard (`/admin`) and automatically logged for trend analysis.

## 3) Backup and Recovery
> Archival is not backup. Keep both.

### Backup Policy
- Daily full logical backup
- Weekly restore drill in non-production
- Retention target: daily (30 days), weekly (12 weeks)

### Backup Scheduling
- Linux cron (daily 01:15):
```bash
15 1 * * * pg_dump "$DATABASE_URL" -F c -f /var/backups/ewtcs/backup_ewtcs_$(date +\%Y\%m\%d_\%H\%M\%S).dump
```
- Managed Postgres: use provider snapshots with equivalent retention.

### Backup and Restore Commands
```bash
pg_dump "$DATABASE_URL" -F c -f backup_ewtcs_$(date +%Y%m%d_%H%M%S).dump
pg_dump "$DATABASE_URL" --schema-only -f schema_ewtcs_$(date +%Y%m%d_%H%M%S).sql
pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" backup_ewtcs_YYYYMMDD_HHMMSS.dump
```

### Post-Restore Validation
```bash
npm run validate:db
npm run db:status
npm run validate:schema
```
- Verify `/api/health`, `/admin`, `/dashboard`, `/analytics`

### Restore Drill Runbook (Weekly)
1. Restore latest backup into staging/non-production.
2. Run validation commands and confirm `/api/health` is healthy.
3. Test login as admin and one non-admin role.
4. Confirm recent audit entries are queryable.
5. Record drill date, backup artifact, and outcome in ops notes.

## 4) Troubleshooting (Common Issues)

| Symptom | Cause | Action |
|---|---|---|
| `password authentication failed` | Invalid DB credentials | Fix `DATABASE_URL` and DB permissions |
| `DATABASE_URL ... is required` | Missing env var | Add env/secret and restart |
| `ENCRYPTION_KEY is required` | Encrypted secret without key | Add `ENCRYPTION_KEY` |
| `/api/health` returns `503` | DB unreachable/degraded | Check DB/network/credentials, run `npm run validate:db` |
| Migration failure | Migration state/history issue | `npm run db:status`, then `npm run db:reconcile` if needed |
| Archival cron `401` | Missing/wrong `CRON_SECRET` | Set secret and send `Authorization: Bearer <CRON_SECRET>` |
| No HTTP→HTTPS redirect | Env/proxy mismatch | Check `NODE_ENV`, `FORCE_HTTPS`, forwarded proto headers |
| Slow dashboard/analytics | Performance regression | Run `npm run perf:seed` and `npm run perf:check` |

Escalate if health is degraded >2 minutes or auth/migration/audit behavior is unstable.

## 5) Incident Response
- Severity: **SEV-1** (outage/data risk), **SEV-2** (major degraded flow), **SEV-3** (minor impact)
- Checklist: contain impact, capture evidence, run `/api/health` + DB + migration checks, communicate status, recover and validate
- Security incidents: follow reporting policy and contacts in `SECURITY.md`

## 6) Security Operations
- Never commit plaintext secrets
- Use encrypted production secrets (`DATABASE_URL_ENCRYPTED` + `ENCRYPTION_KEY`)
- Rotate DB/session secrets every 90 days
- Verify HTTPS redirect + HSTS in staging/production
- Monitor certificates: `npm run security:ssl:check`
- Keep audit logs append-only and review privileged actions

Pre-release checks:
```bash
npm audit --audit-level=high --omit=dev
npm run validate:all
npm test
```

## 7) Command Reference

### App Lifecycle
```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Database
```bash
npm run db:migrate
npm run db:rollback
npm run db:status
npm run db:create
npm run db:seed
npm run seed:config
npm run db:reset
npm run db:reconcile
npm run audit:verify
```

### US-21.1 Operational Notes
- New migration: `046_add_patient_demographics_to_beds.sql`
- Added bed demographics columns used by triage and dashboard views:
	- `patient_ipd_id`
	- `patient_age`
	- `patient_gender`
- Deployment action: run `npm run db:migrate` before serving traffic after updating to this release.

Dev runtime note:
- `npm run dev` now clears `.next` before startup to reduce stale chunk load errors during local development.

### US-22.1 Operational Notes
- New migrations: `047_enforce_symptom_40_char_limit.sql`, `1774000000000_enforce_symptom_40_char_limit_after_triage.sql`
- Triage complaint field (`beds.key_symptom`) is now strictly limited to 40 characters.
- Deployment action: run `npm run db:migrate` before application startup after pulling this release.

### Validation, Tests, and Ops
```bash
npm run validate:env
npm run validate:db
npm run validate:migrations
npm run validate:schema
npm run validate:all
npm test
npm run test:coverage
npm run perf:seed
npm run perf:check
npm run perf:validate
npm run security:ssl:check
```

Archival API:
```http
GET /api/cron/archival
Authorization: Bearer <CRON_SECRET>
```

## 8) Release Update Protocol
Update this handbook in release PRs when environment validation, migrations/schema, retention/archival, security controls, or operational commands change.

Release checklist:
1. Update changed sections in this file
2. Verify commands against `package.json`
3. Confirm troubleshooting steps match current behavior
4. Update `Last Updated`
5. Check PR box: `ADMIN_HANDBOOK.md updated ...`

## References
- `CONFIGURATION.md`
- `DATABASE_SETUP.md`
- `README.md`
- `docs/README.md`
- `src/shared/config/env.ts`
- `src/shared/config/init.ts`
- `src/middleware.ts`
- `src/app/api/health/route.ts`
- `src/app/api/cron/archival/route.ts`
- `SECURITY.md` 
Triage feature metadata is also included in bed management ops.
