# EWTCS Installation Guide

> **Audience:** System Administrators deploying EWTCS to a server.  
> This guide covers a full production deployment from a clean server.  
> For local development setup, see [QUICKSTART.md](QUICKSTART.md).

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Prerequisites](#2-prerequisites)
3. [Get the Application](#3-get-the-application)
4. [Install Node Dependencies](#4-install-node-dependencies)
5. [Database Setup](#5-database-setup)
6. [Environment Configuration](#6-environment-configuration)
7. [Build & Migrate](#7-build--migrate)
8. [Verify the Installation](#8-verify-the-installation)
9. [Run as a System Service](#9-run-as-a-system-service)
10. [Reverse Proxy & SSL](#10-reverse-proxy--ssl)
11. [Firewall Rules](#11-firewall-rules)
12. [Security Hardening](#12-security-hardening)
13. [Backup & Restore](#13-backup--restore)
14. [Updating the Application](#14-updating-the-application)
15. [Troubleshooting](#15-troubleshooting)
16. [Maintenance Checklist](#16-maintenance-checklist)

---

## 1. System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Ubuntu 22.04 LTS / Windows Server 2022 | Ubuntu 22.04 LTS |
| CPU | 2 cores | 4 cores |
| RAM | 2 GB | 4 GB |
| Disk | 10 GB | 20 GB SSD |
| Node.js | 18.x | 20.x LTS |
| PostgreSQL | 14.x | 16.x |
| Network | Port 80, 443 open | HTTPS with valid certificate |

---

## 2. Prerequisites

### Node.js 18+

**Ubuntu / Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # Should print v20.x.x
```

**Windows Server:**  
Download and run the LTS installer from [nodejs.org](https://nodejs.org/). Verify in PowerShell:
```powershell
node --version   # Should print v20.x.x
```

---

### PostgreSQL 14+

**Ubuntu / Debian:**
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
pg_isready     # Should print: /var/run/postgresql:5432 - accepting connections
```

**Windows Server:**  
Download from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/).  
During installation, note the password you set for the `postgres` superuser.

---

### Git

**Ubuntu:**
```bash
sudo apt install -y git
git --version   # git version 2.x.x
```

**Windows Server:**  
Download from [git-scm.com](https://git-scm.com/download/win).

---

## 3. Get the Application

### Option A — Clone from GitHub (Recommended)

```bash
git clone https://github.com/somuyakhandelwal/EWTCS.git /opt/ewtcs
cd /opt/ewtcs
```

> **Windows:** Adjust the path, e.g. `C:\apps\ewtcs`

### Option B — Download ZIP

1. Go to `https://github.com/somuyakhandelwal/EWTCS`
2. Click **Code → Download ZIP**
3. Extract to `/opt/ewtcs` (Ubuntu) or `C:\apps\ewtcs` (Windows)

---

## 4. Install Node Dependencies

Use `npm ci` on servers — it installs exact versions from `package-lock.json` for reproducible builds:

```bash
cd /opt/ewtcs
npm ci --omit=dev
```

Expected output ends with:
```
added 312 packages in 18s
```

---

## 5. Database Setup

### Create a dedicated database user

Do **not** use the `postgres` superuser in production. Create a restricted user:

```bash
sudo -u postgres psql
```

Inside `psql`:
```sql
CREATE USER ewtcs_user WITH PASSWORD 'StrongPassword123!';
CREATE DATABASE ewtcs OWNER ewtcs_user;
GRANT ALL PRIVILEGES ON DATABASE ewtcs TO ewtcs_user;
\q
```

> Replace `StrongPassword123!` with a strong password (min 16 characters, mixed case, symbols).

### Verify connectivity

```bash
psql -U ewtcs_user -h localhost -d ewtcs -c "SELECT 1;"
# Should print: ?column? = 1
```

---

## 6. Environment Configuration

### Copy the template

```bash
cd /opt/ewtcs
cp .env.example .env.local
```

### Edit `.env.local`

Open the file with a text editor (`nano .env.local` on Ubuntu, Notepad on Windows) and fill in every value:

```env
# --- Required ---
DATABASE_URL=postgresql://ewtcs_user:StrongPassword123!@localhost:5432/ewtcs
SESSION_SECRET=REPLACE_WITH_64_CHAR_RANDOM_STRING
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# --- HTTPS enforcement (EPIC 17) ---
# Middleware redirects HTTP → HTTPS in staging/production by default.
# Set to false ONLY if your reverse proxy already handles redirection.
FORCE_HTTPS=true

# --- AI Summary (optional but needed for EPIC 9 reports) ---
# GEMINI_API_KEY=your-gemini-api-key

# --- Alert threshold (default 3 hours) ---
RED_ALERT_THRESHOLD_MS=10800000
```

### Generate a strong SESSION_SECRET

**Ubuntu:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Windows PowerShell:**
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the output (96-character hex string) as your `SESSION_SECRET`.

> **Security rule:** Never commit `.env.local` to Git. It is already listed in `.gitignore`.

### Using encrypted secrets (recommended for production)

Encrypt sensitive values so they are never stored in plain text:

```bash
node scripts/encrypt-secret.js "postgresql://ewtcs_user:StrongPassword123!@localhost:5432/ewtcs" "your-master-encryption-key"
```

Then in `.env.local`:
```env
DATABASE_URL_ENCRYPTED=<ivhex>:<encryptedhex>
ENCRYPTION_KEY=your-master-encryption-key
# Remove DATABASE_URL if using the encrypted variant
```

---

## 7. Build & Migrate

Run these commands **in order**:

### Build the application

```bash
npm run build
```

Expected output ends with:
```
Route (app)                 Size  First Load JS
...
✓ Compiled successfully
```

Build time: ~30–60 seconds.

### Apply database migrations

```bash
npm run db:migrate
```

Expected output:
```
Running migrations...
✓ 001_init.sql
✓ 002_add_user_lockout.sql
...
✓ 038_create_alert_preferences.sql
All 38 migrations completed successfully.
```

### Seed initial data

```bash
npm run db:seed        # Creates user accounts
npm run seed:config    # Creates beds (ER-01 to ER-50) and workflow stages
```

### Run all validations

```bash
npm run validate:all
```

This runs 4 checks in sequence — all must pass before going live:
- `validate:env` — all required environment variables present
- `validate:db` — database connection succeeds
- `validate:migrations` — all migrations applied
- `validate:schema` — database schema matches expectations

Expected final line: `All validations passed.`

---

## 8. Verify the Installation

### Check the health endpoint

Start the server temporarily to test:

```bash
npm run start &
sleep 5
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-03T10:00:00.000Z",
  "environment": "production",
  "version": "0.1.0",
  "checks": {
    "configuration": "pass",
    "environment": "pass",
    "database": "pass"
  }
}
```

Any `"fail"` in checks means the system is not ready — re-check the corresponding step above.

### First browser login

Open `http://localhost:3000` and log in with the default credentials:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin1` | `Nurse@123` |
| Supervisor | `supervisor1` | `Nurse@123` |
| Nurse | `nurse` / `nurse1` | `Nurse@123` |
| Auditor | `auditor1` | `Nurse@123` |

> **Important:** Change all default passwords immediately — see [Section 12](#12-security-hardening).

Stop the temporary server: `kill %1` (Ubuntu) or close the terminal (Windows).

---

## 9. Run as a System Service

### Linux — systemd

Create the service file:

```bash
sudo nano /etc/systemd/system/ewtcs.service
```

Paste:
```ini
[Unit]
Description=EWTCS Emergency Ward Monitoring System
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/ewtcs
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ewtcs
EnvironmentFile=/opt/ewtcs/.env.local

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ewtcs
sudo systemctl start ewtcs
sudo systemctl status ewtcs   # Should show: active (running)
```

View logs:
```bash
sudo journalctl -u ewtcs -f
```

### Windows Server — NSSM

1. Download NSSM from [nssm.cc](https://nssm.cc/download)
2. Extract to `C:\tools\nssm`
3. Open an Administrator PowerShell:

```powershell
C:\tools\nssm\win64\nssm.exe install EWTCS "C:\Program Files\nodejs\npm.cmd" "run start"
C:\tools\nssm\win64\nssm.exe set EWTCS AppDirectory "C:\apps\ewtcs"
C:\tools\nssm\win64\nssm.exe set EWTCS AppEnvironmentExtra "NODE_ENV=production"
C:\tools\nssm\win64\nssm.exe set EWTCS Start SERVICE_AUTO_START
Start-Service EWTCS
Get-Service EWTCS   # Status should be: Running
```

---

## 10. Reverse Proxy & SSL

The Node.js server runs on port 3000. Use nginx to serve it on standard ports 80/443 with HTTPS.

### Install nginx

```bash
sudo apt install -y nginx
```

### Use the production nginx config included in the repo

The repository ships a hardened `nginx.conf` (EPIC 17) with rate limiting, security headers, and DDoS protection. Use it directly:

```bash
# Copy the repo's config into nginx
sudo cp /opt/ewtcs/nginx.conf /etc/nginx/nginx.conf

# Replace the placeholder domain
sudo sed -i 's/yourdomain.com/your-domain.com/g' /etc/nginx/nginx.conf

# Set your SSL certificate paths (update these two lines)
sudo nano /etc/nginx/nginx.conf
# ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

Key protections in the included config:

| Protection | Detail |
|---|---|
| HTTP → HTTPS redirect | All port-80 traffic permanently redirected |
| HSTS header | `max-age=31536000; includeSubDomains` |
| Login rate limit | 5 req/min per IP on `/api/auth/login` |
| API rate limit | 100 req/min per IP on `/api/*` |
| Security headers | `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, XSS protection |
| Malicious agent blocking | Blocks nikto, sqlmap, nmap, masscan, zgrab |

Test and reload:
```bash
sudo nginx -t          # Should print: syntax is ok / test is successful
sudo systemctl reload nginx
```

### Obtain SSL certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
# Follow prompts — auto-renews every 90 days
```

For **internal hospital networks without internet access**, use a self-signed certificate:
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/ewtcs.key \
  -out /etc/ssl/certs/ewtcs.crt
# Reference these paths in the nginx ssl_certificate lines above
```

---

## 11. Firewall Rules

Block direct access to Node.js and PostgreSQL ports. Only expose 80 and 443.

**Ubuntu (ufw):**
```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw deny 3000/tcp     # Block direct Node.js access
sudo ufw deny 5432/tcp     # Block direct PostgreSQL access
sudo ufw enable
sudo ufw status            # Verify rules
```

**Windows Server (PowerShell):**
```powershell
New-NetFirewallRule -DisplayName "Allow HTTP"  -Direction Inbound -Protocol TCP -LocalPort 80  -Action Allow
New-NetFirewallRule -DisplayName "Allow HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
New-NetFirewallRule -DisplayName "Block Node"  -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Block
New-NetFirewallRule -DisplayName "Block PG"    -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Block
```

---

## 12. Security Hardening

### Change all default passwords immediately

Log in to `https://your-domain.com` as `admin1` / `Nurse@123` and navigate to **Admin → Users**. Change the password for every default account:

| Account | What to do |
|---------|------------|
| `admin1` | Set a strong password, minimum 12 characters |
| `supervisor1` | Set a strong password |
| `nurse` | Set a strong password |
| `nurse1` | Set a strong password |
| `auditor1` | Set a strong password |

**Password requirements:** minimum 8 characters, at least one uppercase, one number.

### Rotate SESSION_SECRET

Generate a new value and restart the service:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# Update SESSION_SECRET in /opt/ewtcs/.env.local
sudo systemctl restart ewtcs
```

### Lock down the database user

Ensure `ewtcs_user` has no more privileges than needed:
```sql
REVOKE CREATE ON SCHEMA public FROM ewtcs_user;
```

### Additional hardening

- Enable PostgreSQL SSL: set `ssl = on` in `postgresql.conf`
- Use fail2ban to block brute-force SSH attempts: `sudo apt install -y fail2ban`
- Keep the OS patched: `sudo apt update && sudo apt upgrade -y`
- Rotate credentials every 90 days

---

## 13. Backup & Restore

### Automated daily backups (Linux)

```bash
sudo nano /usr/local/bin/ewtcs-backup.sh
```

Paste:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/ewtcs"
DATE=$(date +%Y-%m-%d)
mkdir -p "$BACKUP_DIR"
pg_dump -U ewtcs_user -h localhost ewtcs | gzip > "$BACKUP_DIR/ewtcs-$DATE.sql.gz"
# Keep only last 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
```

Make executable and schedule:
```bash
sudo chmod +x /usr/local/bin/ewtcs-backup.sh
# Run at 2 AM every night
echo "0 2 * * * root /usr/local/bin/ewtcs-backup.sh" | sudo tee /etc/cron.d/ewtcs-backup
```

### Restore from backup

```bash
gunzip -c /var/backups/ewtcs/ewtcs-2026-03-03.sql.gz | psql -U ewtcs_user -h localhost ewtcs
```

> **Test your backups monthly** by restoring to a staging database.

---

## 14. Updating the Application

Follow this sequence for zero-downtime updates:

```bash
cd /opt/ewtcs

# 1. Pull latest code
git pull origin main

# 2. Install any new dependencies
npm ci --omit=dev

# 3. Build the updated application
npm run build

# 4. Apply any new database migrations (safe — runs in a single transaction)
npm run db:migrate

# 5. Run validations
npm run validate:all

# 6. Restart the service
sudo systemctl restart ewtcs
sudo systemctl status ewtcs

# 7. Verify health
curl https://your-domain.com/api/health
```

> If `validate:all` fails after a pull, **do not restart the service**. Roll back the migration with `npm run db:rollback` and investigate before proceeding.

---

## 15. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `ECONNREFUSED 5432` | PostgreSQL not running | `sudo systemctl start postgresql` |
| `password authentication failed` | Wrong `DATABASE_URL` credentials | Re-check `.env.local` |
| `relation "users" does not exist` | Migrations not applied | `npm run db:migrate` |
| `SESSION_SECRET must be at least 32 chars` | Short or missing secret | Generate a 64-char secret (see Step 6) |
| `Cannot find module` after update | Missing dependency | `npm ci --omit=dev` |
| `502 Bad Gateway` (nginx) | Node.js service not running | `sudo systemctl restart ewtcs` |
| `403 Forbidden` on admin pages | Logged in as wrong role | Log in as `admin1` |
| Health endpoint shows `"database": "fail"` | DB connection failing | Verify network, credentials, pg status |
| Service starts then crashes | Runtime error | `sudo journalctl -u ewtcs -n 100 --no-pager` |
| `ENCRYPTION_KEY is required` | Encrypted secret set without key | Add `ENCRYPTION_KEY` to `.env.local` |

### View application logs

```bash
# Linux - systemd
sudo journalctl -u ewtcs -f --no-pager

# View last 100 lines
sudo journalctl -u ewtcs -n 100 --no-pager

# Windows - NSSM writes to Application event log
Get-EventLog -LogName Application -Source EWTCS -Newest 20
```

---

## 16. Maintenance Checklist

### Weekly
- [ ] Verify `sudo systemctl status ewtcs` is `active (running)`
- [ ] Check `/api/health` returns all `"pass"`
- [ ] Confirm backups are being created in `/var/backups/ewtcs/`
- [ ] Review audit logs for unusual activity (Admin → Audit Logs)

### Monthly
- [ ] Test backup restore on a staging database
- [ ] Apply OS security updates: `sudo apt update && sudo apt upgrade -y`
- [ ] Rotate `SESSION_SECRET` and restart the service
- [ ] Check disk space: `df -h`

### On every release
- [ ] Follow the full [Updating the Application](#14-updating-the-application) sequence
- [ ] Run `npm run validate:all` before restarting the production service
- [ ] Verify `/api/health` after restart

---

## Related Documentation

- [QUICKSTART.md](QUICKSTART.md) — Local development setup (5 minutes)
- [CONFIGURATION.md](CONFIGURATION.md) — Full environment variable reference (includes HTTPS/TLS section)
- [DATABASE_SETUP.md](DATABASE_SETUP.md) — Detailed database configuration
- [docs/infrastructure/DEPLOYMENT.md](docs/infrastructure/DEPLOYMENT.md) — Cloud deployment alternative (Railway, Render, Docker)
- [SECURITY.md](SECURITY.md) — Vulnerability reporting policy and security features overview
- [docs/README.md](docs/README.md) — Complete documentation index

---

**Last Updated:** March 2026 | **Epic:** EPIC 18 — Deployment, Training & Documentation
