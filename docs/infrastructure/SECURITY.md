# Security Architecture — EWTCS
> EPIC 17: Security & Privacy | JMCH Medical College Emergency Ward System

## 1. Hosting & HIPAA Compliance

### Recommended Providers
| Provider | HIPAA BAA | DDoS Protection | Uptime SLA |
|----------|-----------|-----------------|------------|
| Railway Pro | ✅ Available | ✅ Cloudflare | 99.9% |
| Render Standard | ✅ Available | ✅ Built-in | 99.95% |
| AWS Elastic Beanstalk | ✅ Available | ✅ AWS Shield | 99.99% |
| Azure App Service | ✅ Available | ✅ Azure DDoS | 99.95% |

### HIPAA Compliance Checklist
- [x] Data encrypted in transit (TLS 1.2+)
- [x] Data encrypted at rest (AES-256)
- [x] Role-based access control (Admin/Supervisor/Nurse/Auditor)
- [x] Immutable audit logs for all PHI access (migration 008, 025)
- [x] Session timeout enforced
- [x] Password hashing with bcrypt (migration 001)
- [x] Account lockout after failed attempts (migration 002)
- [x] No patient names in free-text fields (US-17, migration 038)
- [x] Encrypted production secrets (ENCRYPTION_KEY)
- [x] IP address logged for every action (migration 025)

---

## 2. DDoS Protection

### Layer 1 — Cloudflare (DNS Level)
1. Add domain to Cloudflare (free tier)
2. Enable **"Under Attack Mode"** during high-risk periods
3. Enable Rate Limiting rules:
   - Login: max 5 requests/minute per IP
   - API: max 100 requests/minute per IP

### Layer 2 — nginx (Application Level)
Rate limiting configured in `nginx.conf`:
- Login endpoint: 5 req/min per IP
- API endpoints: 100 req/min per IP
- General traffic: 30 req/sec per IP

### Layer 3 — Application Level
- Account lockout after repeated failed logins
- JWT token blacklisting on logout
- Session validation on every request

---

## 3. Firewall Rules

| Port | Protocol | Allow From | Purpose |
|------|----------|------------|---------|
| 443 | HTTPS | 0.0.0.0/0 | Web traffic |
| 80 | HTTP | 0.0.0.0/0 | Redirect to HTTPS only |
| 5432 | PostgreSQL | App server IP only | Database |
| 22 | SSH | Admin IPs only | Server management |

### Intrusion Detection
- **Fail2ban** — auto-bans IPs with 5+ failed SSH attempts
- **Application lockout** — user accounts locked after failed logins (migration 002)
- **Audit logging** — every action logged with user ID + IP (migration 025)
- **Immutable audit trail** — DB triggers prevent log tampering (migration 008)
- **Automated scanning** — weekly `npm audit` via GitHub Actions

---

## 4. Security Updates

### Automated (GitHub Actions)
- Runs every Monday at 9 AM
- Scans all npm dependencies for vulnerabilities
- Blocks PRs with high/critical vulnerabilities
- See `.github/workflows/security-updates.yml`

### Manual
```bash
# Check for vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# Check for outdated packages
npm outdated
```

---

## 5. Uptime SLA (99.9%)

| Component | Strategy |
|-----------|----------|
| Application | Auto-restart on crash (Railway/Render) |
| Database | PostgreSQL with daily automated backups |
| Health Check | `/api/health` monitored every 60 seconds |
| Alerting | UptimeRobot free tier (monitors /api/health) |

### Health Check
```
GET /api/health
200 OK → { status: "healthy", checks: { database: true } }
```

---

## 6. Security Headers

Applied via `next.config.js`:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 7. Incident Response Plan

| Step | Action |
|------|--------|
| 1. Detection | UptimeRobot alert or user report |
| 2. Assessment | Check `/api/health` + audit logs |
| 3. Containment | Enable Cloudflare "Under Attack Mode" |
| 4. Recovery | Restore from latest DB backup |
| 5. Post-mortem | Document in `docs/infrastructure/incidents/` |

**Emergency Contact:** somuyakhandelwal@gmail.com