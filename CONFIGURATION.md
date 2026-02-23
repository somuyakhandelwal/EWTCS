# Configuration Guide for EWTCS

EWTCS uses environment variables for multi-environment configuration with support for encrypted production secrets.

## Quick Start

1. Copy `.env.example` to `.env.local`
2. Set `DATABASE_URL`, `SESSION_SECRET`, and `NEXT_PUBLIC_APP_URL`
3. Run `npm run dev` (development)

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string (dev/staging) OR
- `DATABASE_URL_ENCRYPTED` - Encrypted connection string (production)
- `SESSION_SECRET` - JWT secret (minimum 32 characters)
- `NEXT_PUBLIC_APP_URL` - Application URL

### Optional
- `NODE_ENV` - `development | staging | production` (default: development)
- `RED_ALERT_THRESHOLD_MS` - Delay threshold in milliseconds (default: 10800000 / 3 hours)
- `OPENAI_API_KEY` - OpenAI API key (plaintext, dev)
- `OPENAI_API_KEY_ENCRYPTED` - Encrypted OpenAI key (production)
- `ENCRYPTION_KEY` - Required if using encrypted secrets

Example `.env.local`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ewtcs
SESSION_SECRET=your-secret-key-min-32-chars-change-in-prod
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Database System Settings (system_settings table)
- `escalation_threshold_minutes` - Critical escalation threshold for delayed beds (default: 240 minutes / 4 hours)

## Encrypted Secrets (Production)

Secrets use the format: `ivhex:encryptedhex`

Generate encrypted secrets:
```bash
node scripts/encrypt-secret.js "postgresql://user:pass@host:5432/db" "master-key"
```

Set results in production environment:
```env
DATABASE_URL_ENCRYPTED=ivhex:encryptedhex
ENCRYPTION_KEY=master-key
```

## Environment-Specific Setup

### Development
```bash
cp .env.example .env.local
# Set DATABASE_URL, SESSION_SECRET, NEXT_PUBLIC_APP_URL
npm run dev
```

### Staging
```bash
# Use .env.staging as template
# Set encrypted secrets via DATABASE_URL_ENCRYPTED if desired
npm run build && npm run start
```

### Production
```bash
# Use AWS Secrets Manager, Vault, or Kubernetes Secrets
# Set: DATABASE_URL_ENCRYPTED, SESSION_SECRET, ENCRYPTION_KEY, NODE_ENV=production
npm run start
```

## Migrations

Version-controlled database schema changes managed by `node-pg-migrate`.

### Commands
```bash
npm run db:migrate   # Apply pending migrations (uses single transaction)
npm run db:reconcile # Reconcile legacy migration history naming/order drift
npm run audit:verify # Verify audit_logs are immutable (UPDATE/DELETE blocked)
npm run db:rollback  # Revert last migration
npm run db:status    # Show applied and pending migrations
npm run db:create    # Create new migration file (timestamped)
npm run db:seed      # Seed user accounts (admin1, nurse, nurse1, supervisor1)
npm run seed:config  # Seed beds (ER-01 to ER-50) and patient workflow stages
npm run db:reset     # Drop and recreate public schema (dev only)
```

### Key Features
- **Single-transaction runs**: All migrations in one transaction for atomicity
- **Encrypted secret support**: Migrations runner decrypts `DATABASE_URL_ENCRYPTED`
- **Status logging**: Start/end timestamps and success/fail status logged
- **Migration history**: Tracked in `pgmigrations` table
- **Automatic deployment**: `npm run start` runs migrations before starting server

### Backward Compatibility
Schema changes must follow these patterns for safe rolling deployments:
- Prefer additive changes (new tables, new nullable columns)
- Add default values for new columns
- Backfill data in separate steps before enforcing `NOT NULL`
- Avoid dropping columns or tables in the same release
- Keep index operations concurrent-friendly for large tables

## Validation & Health Checks

### Startup Validation
Configuration is validated on startup:
- Environment variable absence/format
- Encrypted secret requirements
- Database connectivity

Validation failure results in error logs and app exit (fail-fast).

### Health Endpoint
```
GET /api/health
```

Response (200 if healthy, 503 if degraded/unhealthy):
```json
{
  "status": "healthy",
  "timestamp": "2026-02-15T10:30:45.123Z",
  "environment": "development",
  "version": "0.1.0",
  "checks": {
    "configuration": "pass",
    "environment": "pass",
    "database": "pass"
  }
}
```

Use health endpoint for deployment readiness checks and monitoring.

## Audit Logging & Compliance

The system uses an immutable `audit_logs` table for compliance-critical events.

### What is logged
- Login and logout actions
- Stage configuration changes (create, update, deactivate, reorder)
- User and bed actions already instrumented through shared audit utilities

### Required audit fields
- `performed_by_user_id` (user ID)
- `action_type` (action name)
- `created_at` (timestamp)
- `ip_address` (client IP captured from request headers)

### Immutability guarantees
- Audit logs are append-only
- Database trigger blocks `UPDATE` and `DELETE` on `audit_logs`
- Corrections should be recorded as new audit events, not in-place edits

## Security Best Practices

- Never commit credentials to git; use `.env.local` (in `.gitignore`)
- Use environment variables for all secrets
- Use encrypted secrets in production (AWS Secrets Manager, Vault, K8s)
- Rotate credentials every 90 days
- Enable SSL/TLS for production database connections
- Mask sensitive values in logs (manually avoid logging secrets like API keys, tokens, passwords, or full connection strings)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `password authentication failed` | Check DATABASE_URL credentials and Postgres is running |
| `permission denied for schema public` | Ensure database user has CREATE privileges on public schema |
| `ENCRYPTION_KEY is required` | Set ENCRYPTION_KEY when using DATABASE_URL_ENCRYPTED |
| `Database connectivity test failed` | Verify Postgres is running on host:port and DATABASE_URL is valid |

Last Updated: 2026-02-21
