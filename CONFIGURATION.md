# Configuration Guide for EWTCS

EWTCS uses environment variables for multi-environment configuration with support for encrypted production secrets.

## Quick Start

1. Copy `.env.example` to `.env.local`
2. Set `DATABASE_URL` and `NEXT_PUBLIC_APP_URL`
3. Run `npm run dev` (development) or validate with `/api/health` (production)

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string (dev/staging) OR
- `DATABASE_URL_ENCRYPTED` - Encrypted connection string (production)
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
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

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
# Set DATABASE_URL and NEXT_PUBLIC_APP_URL
npm run dev
```

### Staging
```bash
# Use .env.staging as template
# Prefer encrypted secrets via DATABASE_URL_ENCRYPTED
npm run build && npm run start
```

### Production
```bash
# Use AWS Secrets Manager, Vault, or Kubernetes Secrets
# Set: DATABASE_URL_ENCRYPTED, ENCRYPTION_KEY, NODE_ENV=production
npm run start
```

## Migrations

Version-controlled database schema changes managed by `node-pg-migrate`.

### Commands
```bash
npm run db:migrate   # Apply pending migrations (uses single transaction)
npm run db:rollback  # Revert last migration
npm run db:status    # Show applied and pending migrations
npm run db:create    # Create new migration file (timestamped)
npm run db:seed      # Seed initial data
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

Last Updated: 2026-02-15
