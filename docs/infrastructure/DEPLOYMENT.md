# Deployment Guide — EWTCS
> JMCH Medical College Emergency Ward System

## Recommended: Railway (Easiest)

### Prerequisites
- Railway account: railway.app
- GitHub repository connected

### Steps

**1. Install Railway CLI**
```bash
npm install -g @railway/cli
railway login
railway init
```

**2. Add PostgreSQL**
- Railway Dashboard → New Service → Database → PostgreSQL
- Copy `DATABASE_URL` from Variables tab

**3. Set Environment Variables**
```env
DATABASE_URL=<from railway postgresql>
SESSION_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
NODE_ENV=production
```

**4. Deploy**
```bash
railway up
```
Migrations run automatically on deploy via `npm run start`.

---

## Alternative: Render

1. New Web Service → Connect GitHub repo
2. Build Command: `npm install && npm run build`
3. Start Command: `npm run start`
4. Add PostgreSQL from Render dashboard
5. Set environment variables in dashboard

---

## Alternative: Docker (Self-Hosted)
```bash
# Copy environment file
cp .env.example .env.production

# Edit with your values
nano .env.production

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

---

## SSL/TLS

Railway and Render provide **automatic SSL certificates**.

For self-hosted with nginx:
```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d yourdomain.com

# Auto-renewal (runs twice daily)
certbot renew --dry-run
```

---

## Database Backups
```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup_20260303.sql

# Automated daily backup (add to crontab)
0 2 * * * pg_dump $DATABASE_URL > /backups/ewtcs_$(date +\%Y\%m\%d).sql
```

---

## Health Monitoring

1. Sign up at **uptimerobot.com** (free)
2. Add new monitor:
   - Type: HTTP(s)
   - URL: `https://yourdomain.com/api/health`
   - Interval: 5 minutes
3. Add alert email for downtime notifications

---

## Post-Deploy Checklist

- [ ] `/api/health` returns `{ status: "healthy" }`
- [ ] Login works with admin1/Nurse@123
- [ ] Change default passwords immediately
- [ ] SSL certificate active (padlock in browser)
- [ ] UptimeRobot monitor active
- [ ] Database backup scheduled