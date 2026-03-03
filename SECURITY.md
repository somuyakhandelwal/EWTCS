# Security Policy — EWTCS
> Emergency Ward Bed Status Monitoring System
> JMCH Medical College & Hospital

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (main branch) | ✅ Active support |
| Feature branches | ⚠️ No security patches |
| Older releases | ❌ Not supported |

## Reporting a Vulnerability

**Do NOT create a public GitHub issue for security vulnerabilities.**

### Contact
📧 Email: somuyakhandelwal@gmail.com

### What to Include
- Description of the vulnerability
- Steps to reproduce
- Potential impact (data exposure, auth bypass, etc.)
- Suggested fix (optional)

### Response Timeline
| Severity | Response Time | Fix Time |
|----------|--------------|----------|
| Critical | 24 hours | 48 hours |
| High | 48 hours | 7 days |
| Medium | 7 days | 30 days |
| Low | 30 days | Next release |

---

## Security Features

### Authentication
- Bcrypt password hashing (cost factor 12)
- JWT session management with token blacklisting
- Account lockout after failed login attempts
- Session timeout enforcement

### Authorization
- Role-based access control (Admin/Supervisor/Nurse/Auditor)
- Ward-level access restrictions
- Write operations denied in audit mode (server-side enforced)

### Data Protection
- No patient names stored in free-text fields (HIPAA — US-17)
- Encrypted production secrets (ENCRYPTION_KEY)
- TLS 1.2+ for all data in transit
- AES-256 encryption for data at rest

### Audit & Compliance
- Immutable audit trail (database-level triggers)
- IP address logged for every action
- All PHI access logged with user ID + timestamp
- Audit logs protected from updates/deletes

### Infrastructure
- DDoS protection via Cloudflare + nginx rate limiting
- Firewall rules (ports 80/443 public, 5432 internal only)
- Automated weekly vulnerability scanning (GitHub Actions)
- Fail2ban intrusion detection

---

## Security Documentation

Full infrastructure security details:
- [`docs/infrastructure/SECURITY.md`](docs/infrastructure/SECURITY.md)
- [`docs/infrastructure/DEPLOYMENT.md`](docs/infrastructure/DEPLOYMENT.md)