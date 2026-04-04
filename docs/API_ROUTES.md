# EWTCS — API Routes Map

All API routes are located under `src/app/api/`. Authentication is enforced via middleware (JWT session cookie) unless explicitly marked as public.

---

## Auth Module

| Route | Method | Auth Required | Purpose | Request Body | Response |
|-------|--------|---------------|---------|--------------|----------|
| `/api/auth/login` | POST | ❌ Public | Authenticate user and create JWT session | `{ username: string, password: string, kioskMode?: boolean }` | `{ success: boolean, redirectTo?: string, message?: string }` |
| `/api/auth/logout` | POST | ✅ Session | Invalidate JWT token (blacklist) and clear session cookie | None | `{ success: true }` |
| `/api/auth/force-logout` | GET | ❌ Public | Server-side cookie clear for stale sessions (breaks redirect loops) | None | 302 redirect to `/login` |

### Login Details
- **IP Rate Limiting:** 10 requests/minute per IP (in-memory)
- **DB Lockout:** 5 failed attempts → 15-minute account lock
- **Kiosk Mode:** Creates IP-bound session with 1-year expiry
- **Temp Password:** Forces redirect to `/change-password` if `must_change_password` is true
- **Audit Logging:** LOGIN, LOGIN_FAILED, LOGIN_BLOCKED events

### Role-Based Redirects After Login
| Role | Redirect |
|------|----------|
| admin | `/admin` |
| supervisor | `/supervisor` |
| auditor | `/analytics` |
| cardiologist | `/cath-lab` |
| cath_lab_nurse | `/cath-lab` |
| nurse | `/dashboard` |
| housekeeping | `/dashboard` |
| doctor | `/dashboard` |

---

## Bed Dashboard Module

| Route | Method | Auth Required | Purpose | Request Body | Response |
|-------|--------|---------------|---------|--------------|----------|
| `/api/bed-dashboard/undo` | POST | ✅ Session (any role, action enforces role) | Undo the last bed stage update | `{ bedId: string }` | `{ success: boolean, error?: string }` |

---

## Bed History Module

| Route | Method | Auth Required | Purpose | Request Body | Response |
|-------|--------|---------------|---------|--------------|----------|
| `/api/bed-history/correct` | POST | ✅ Session (supervisor/admin enforced in action) | Submit a correction to a bed stage log entry | `{ bedStageLogId: string, correctionReason: string, correctedFields: { notes?: string, transition_time?: string } }` | `{ success: boolean, error?: string }` |

---

## Daily Summary Module (EPIC 9: AI Reports)

| Route | Method | Auth Required | Purpose | Request Body | Response |
|-------|--------|---------------|---------|--------------|----------|
| `/api/daily-summary/generate` | POST | ✅ Session (admin/supervisor via action) | Trigger daily summary aggregation + AI generation | `{ date?: "YYYY-MM-DD" }` (defaults to yesterday) | `{ success: boolean, data?: object }` |
| `/api/daily-summary/generate` | GET | ✅ Session (admin/supervisor/auditor) | Fetch recent daily summaries | Query: `?limit=30` (max 90) | `{ success: boolean, data?: object[] }` |
| `/api/daily-summary/[date]` | GET | ✅ Session | Fetch a specific daily summary by date | URL param: `date` (YYYY-MM-DD) | `{ success: boolean, data?: object }` |

---

## External Integration Module

⚠️ **Auth: API Key** — These routes use `x-api-key` header authentication, NOT JWT session cookies.

| Route | Method | Auth Required | Purpose | Request Body | Response |
|-------|--------|---------------|---------|--------------|----------|
| `/api/external/beds` | GET | ✅ API Key (`x-api-key`) | Read-only list of all beds and their current status | None | `{ status: "success", data: { beds: [...] } }` |
| `/api/external/reports` | GET | ✅ API Key (`x-api-key`) | Read-only bed performance reports over a date range | Query: `?startDate=...&endDate=...` (defaults: last 30 days) | `{ status: "success", data: { report: {...} } }` |
| `/api/external/docs` | GET | ❌ Public | OpenAPI 3.0 specification for external endpoints | None | OpenAPI JSON document |

### External API Rate Limits
- `/api/external/beds`: 60 requests/minute per IP
- `/api/external/reports`: 30 requests/minute per IP

---

## Backup Module

| Route | Method | Auth Required | Purpose | Request Body | Response |
|-------|--------|---------------|---------|--------------|----------|
| `/api/backup/status` | GET | ✅ Admin only | List backup files, latest backup info, encryption status | None | `{ backupDir, totalFiles, totalKB, latest, files[], encryptionEnabled, retentionDays }` |
| `/api/backup/status` | POST | ✅ Admin only | Trigger a backup run in background | None | `{ triggered: true, logFile, message }` |
| `/api/backup/restore` | POST | ✅ Admin only | Restore a specific backup file | `{ filename: string }` | `{ triggered: true, filename, logFile, message }` |

⚠️ Restore runs in background — check `logs/restore.log` for progress.

---

## Cron Module

| Route | Method | Auth Required | Purpose | Request Body | Response |
|-------|--------|---------------|---------|--------------|----------|
| `/api/cron/archival` | GET | ✅ Bearer Token (`CRON_SECRET`) | Monthly automated data archival | None | `{ status: "completed"/"pending_approval"/"failed", runId, rowsArchived? }` |

⚠️ Protected by `CRON_SECRET` env var, NOT JWT session. Called by Vercel Cron or system crontab.

When `retention_requires_approval = true`, creates a `pending_approval` archival run that an admin must approve via the UI.

---

## Feedback Module

| Route | Method | Auth Required | Purpose | Request Body | Response |
|-------|--------|---------------|---------|--------------|----------|
| `/api/feedback` | POST | ✅ Any authenticated user | Submit user feedback for adoption monitoring | `{ category: string, rating?: 1-5, message?: string }` | `{ success: true, id: string }` (201) |

---

## Health Module

| Route | Method | Auth Required | Purpose | Request Body | Response |
|-------|--------|---------------|---------|--------------|----------|
| `/api/health` | GET | ❌ Public | Application health check with DB connectivity and system metrics | None | `{ status: "healthy"/"degraded", timestamp, system: {...}, database: { reachable, pool } }` |

Returns 503 if database is unreachable.

---

## Help Module

| Route | Method | Auth Required | Purpose | Request Body | Response |
|-------|--------|---------------|---------|--------------|----------|
| `/api/help/events` | POST | ✅ Session (via middleware) | Track help panel usage analytics | `{ eventType: "open"/"close"/"search"/"start_tour"/"finish_tour", routeKey: string, query?: string }` | `{ success: true }` |

---

## Monitoring Module

| Route | Method | Auth Required | Purpose | Request Body | Response |
|-------|--------|---------------|---------|--------------|----------|
| `/api/monitoring/errors` | GET | ✅ Admin only | Fetch error summary and recent error events | Query: `?limit=50&level=ERROR&unacked=true` | `{ summary: {...}, recent: [...] }` |
| `/api/monitoring/errors` | PATCH | ✅ Admin or Supervisor | Acknowledge an error event | `{ id: string }` | `{ acknowledged: true, id }` |
| `/api/monitoring/track` | POST | ✅ Session (via middleware) | Record a page request for system metrics | None | `{ success: true }` |

---

## Summary Table (All 18 Route Files)

| # | Route File | Methods | Auth | Module |
|---|-----------|---------|------|--------|
| 1 | `auth/login/route.ts` | POST | Public | Auth |
| 2 | `auth/logout/route.ts` | POST | Session | Auth |
| 3 | `auth/force-logout/route.ts` | GET | Public | Auth |
| 4 | `bed-dashboard/undo/route.ts` | POST | Session | Bed Dashboard |
| 5 | `bed-history/correct/route.ts` | POST | Session (supervisor/admin) | Bed History |
| 6 | `daily-summary/generate/route.ts` | POST, GET | Session (admin/supervisor/auditor) | AI Summary |
| 7 | `daily-summary/[date]/route.ts` | GET | Session | AI Summary |
| 8 | `external/beds/route.ts` | GET | API Key | External |
| 9 | `external/reports/route.ts` | GET | API Key | External |
| 10 | `external/docs/route.ts` | GET | Public | External |
| 11 | `backup/status/route.ts` | GET, POST | Admin only | Backup |
| 12 | `backup/restore/route.ts` | POST | Admin only | Backup |
| 13 | `cron/archival/route.ts` | GET | CRON_SECRET Bearer | Cron |
| 14 | `feedback/route.ts` | POST | Any authenticated | Feedback |
| 15 | `health/route.ts` | GET | Public | Health |
| 16 | `help/events/route.ts` | POST | Session | Help |
| 17 | `monitoring/errors/route.ts` | GET, PATCH | Admin / Supervisor | Monitoring |
| 18 | `monitoring/track/route.ts` | POST | Session | Monitoring |

> ⚠️ **Note:** Many bed operations (stage updates, patient admission, bed CRUD) are handled via **Next.js Server Actions** in the `features/` directory rather than traditional API routes. These are invoked directly from React Server Components and are not accessible as REST endpoints.
