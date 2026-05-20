# EWTCS — Architecture: External Services & Environment Variables

> This document is part 2 of the Architecture overview. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the system description, tech stack, folder structure, and data flow.

---

## 5. External Services / APIs

| Service | Purpose | Required? |
|---|---|---|
| **Google Gemini AI** | AI-powered daily summary reports (EPIC 9) | Optional — placeholder returned without key |
| **Slack / Teams Webhooks** | Backup failure and error alerting | Optional |
| **External Hospital Systems** | Read-only API (`/api/external/*`) with API key auth | Consumer-side |

---

## 6. Environment Variables

### Required

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | JWT signing key (min 32 chars, HS256) |
| `NEXT_PUBLIC_APP_URL` | Public application URL |
| `PORT` | Application port (default: 3000) |
| `NODE_ENV` | Environment mode: `development`, `staging`, `production` |

### Security

| Variable | Purpose |
|---|---|
| `FORCE_HTTPS` | Force HTTP → HTTPS redirects in staging/production |
| `HSTS_PRELOAD` | Enable HSTS preload header |
| `ENCRYPTION_KEY` | 64-char hex key for AES-256-CBC data-at-rest encryption |
| `CRON_SECRET` | Bearer token for authenticating cron job endpoints |
| `EXTERNAL_API_KEY` | API key for external integration endpoints |
| `INACTIVITY_TIMEOUT_MS` | Idle session timeout (default: 30 min) |
| `SESSION_MAX_AGE_MS` | Maximum session lifetime (default: 12 hours) |

### Features

| Variable | Purpose |
|---|---|
| `RED_ALERT_THRESHOLD_MS` | Delay alert threshold (default: 3 hours) |
| `GEMINI_API_KEY` | Google Gemini API key for AI daily summaries |
| `DAILY_SUMMARY_TIMEZONE` | Timezone for daily aggregation (default: Asia/Kolkata) |

### Real-time & Caching

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_REALTIME_ENABLED` | Enable polling-based real-time updates |
| `NEXT_PUBLIC_REALTIME_POLLING_INTERVAL_MS` | Poll interval (default: 3000ms) |
| `NEXT_PUBLIC_CACHE_ENABLED` | Enable localStorage offline cache |
| `NEXT_PUBLIC_CACHE_EXPIRY_MS` | Cache freshness window (default: 5 min) |
| `NEXT_PUBLIC_CACHE_MAX_SIZE_BYTES` | Max cache size (default: 1.5 MB) |

### Backup & Monitoring

| Variable | Purpose |
|---|---|
| `BACKUP_PATH` | Directory for backup files |
| `BACKUP_RETENTION_DAYS` | Retention period for backups (default: 30 days) |
| `BACKUP_ALERT_WEBHOOK_URL` | Webhook for backup failure alerts |
| `ERROR_ALERT_WEBHOOK_URL` | Webhook for runtime error alerts |

### Encrypted Secrets (Production)

| Variable | Purpose |
|---|---|
| `DATABASE_URL_ENCRYPTED` | Encrypted database connection string |
| `ENCRYPTION_KEY` | Master key for decrypting production secrets |
