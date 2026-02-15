# Configuration Guide for EWTCS

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
