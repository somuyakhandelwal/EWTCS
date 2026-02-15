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
- Environment variable presence & format
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
## Overview

EWTCS uses environment variables for configuration across development, staging, and production. Configuration is validated on startup and a health endpoint is available for monitoring.

## Environment Variables

Example templates are included in the repository:
- .env.example (general template)
- .env.development
- .env.staging
- .env.production

Required:
- DATABASE_URL (plaintext, dev/staging) OR DATABASE_URL_ENCRYPTED (production)
- NEXT_PUBLIC_APP_URL
- NODE_ENV (development | staging | production)

Optional:
- RED_ALERT_THRESHOLD_MS (default 10800000)
- OPENAI_API_KEY (plaintext, dev/staging)
- OPENAI_API_KEY_ENCRYPTED (recommended)
- ENCRYPTION_KEY (required for encrypted secrets)

## Encrypted Secrets

Encrypted secrets use the format:

```
ivhex:encryptedhex
```

In production, DATABASE_URL_ENCRYPTED is required and DATABASE_URL is not allowed. ENCRYPTION_KEY is required when any encrypted secret is provided.

## Generating Encrypted Secrets

Use the helper script to encrypt values before setting them in environment variables:

```
node scripts/encrypt-secret.js "postgresql://user:password@host:5432/ewtcs" "your-32-byte-master-key"
```

The output format is:

```
ivhex:encryptedhex
```

Set the result as DATABASE_URL_ENCRYPTED and store ENCRYPTION_KEY securely.

## Setup by Environment

Development:
1. Copy .env.example to .env.local
2. Set DATABASE_URL and NEXT_PUBLIC_APP_URL
3. Set NODE_ENV=development
4. Start with npm run dev

Staging:
1. Use .env.staging as a template
2. Set NODE_ENV=staging
3. Prefer encrypted secrets
4. Run npm run build then npm run start

Production:
1. Use .env.production as a template
2. Set NODE_ENV=production
3. Provide DATABASE_URL_ENCRYPTED and ENCRYPTION_KEY
4. Use secret management (AWS Secrets Manager, Vault, or Kubernetes Secrets)

## Configuration Validation

On startup, the system validates:
- Environment variable presence and format
- Encrypted secret requirements
- Database connectivity

If validation fails, the app reports errors in logs and fails startup.

## Health Endpoint

GET /api/health returns status 200 when healthy and 503 when degraded or unhealthy.

Example response:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-14T10:30:45.123Z",
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
## Security Best Practices

- Never commit real credentials to git
- Use separate credentials per environment
- Use encrypted secrets in production
- Rotate credentials regularly
- Enforce SSL/TLS for production database connections
- Mask sensitive values in logs

## Troubleshooting

Invalid DATABASE_URL:
- Must be postgresql://username:password@host:port/db

Database connectivity failure:
- Ensure PostgreSQL is running
- Verify credentials and port

Validation errors:
- Ensure required variables are set
- Ensure ENCRYPTION_KEY is set when using encrypted secrets

Last Updated: 2026-02-14
