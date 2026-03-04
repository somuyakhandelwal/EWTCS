# GitHub Secrets Configuration Guide

**EPIC 17: Security & Privacy**

Guide for configuring GitHub Secrets and environment variables for the security scanning notification system.

---

## 🔐 Overview

The EWTCS security scanning system uses GitHub Secrets to securely store credentials for:
- Email notifications
- Slack webhooks
- System configuration

This guide explains how to set up each secret.

---

## ⚙️ GitHub Secrets Setup

### Location

1. Go to: https://github.com/[owner]/[repo]/settings/secrets/actions
2. Click: **New repository secret**
3. Enter: Name (from table below) and Value
4. Click: **Add secret**

---

## 📋 Required & Optional Secrets

| Secret Name | Required? | Purpose | Example |
|-------------|-----------|---------|---------|
| `SECURITY_EMAIL` | Optional* | Email for scan notifications | `security@hospital.com` |
| `SLACK_WEBHOOK_URL` | Optional* | Slack channel webhook | `https://hooks.slack.com/services/...` |
| `MAIL_SERVER` | Optional* | SMTP server hostname | `smtp.gmail.com` |
| `MAIL_PORT` | Optional* | SMTP port | `587` |
| `MAIL_USERNAME` | Optional* | SMTP username | `noreply@hospital.com` |
| `MAIL_PASSWORD` | Optional* | SMTP password/app token | `[encrypted-password]` |

**Note:** At least ONE notification method should be configured (email OR Slack). System works without both, but provides no alerts.

---

## 🔑 Secret Configuration Details

### 1. SECURITY_EMAIL

**Purpose:** Email address that receives vulnerability scan notifications

**Value:**
```
security@hospital.com
```

**Steps:**
1. Decide which email address should receive alerts
2. Go to GitHub Secrets
3. Add new secret: `SECURITY_EMAIL`
4. Value: `security@hospital.com`

---

### 2. SLACK_WEBHOOK_URL

**Purpose:** Slack incoming webhook for channel notifications

**Steps:**

1. Go to: https://api.slack.com/apps
2. Create New App → From scratch
3. App name: `EWTCS Security Scanner`
4. Select workspace
5. Enable: **Incoming Webhooks**
6. Add New Webhook to Workspace
7. Select channel: `#security-alerts`
8. Copy webhook URL
9. Go to GitHub Secrets
10. Add new secret: `SLACK_WEBHOOK_URL`
11. Value: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX...`

**Test:**
```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message"}' \
  YOUR_SLACK_WEBHOOK_URL
```

---

### 3. MAIL_SERVER

**Purpose:** SMTP server for sending emails

**Common Values:**
- Gmail: `smtp.gmail.com`
- Office365: `smtp.office365.com`
- AWS SES: `email-smtp.[region].amazonaws.com`
- Custom: `mail.yourdomain.com`

**Example:**
```
smtp.gmail.com
```

---

### 4. MAIL_PORT

**Purpose:** SMTP port number

**Common Values:**
- TLS (Recommended): `587`
- SSL: `465`
- Unsecured: `25`

**Example:**
```
587
```

---

### 5. MAIL_USERNAME

**Purpose:** SMTP authentication username

**Examples:**
- Gmail: `your-email@gmail.com`
- Custom: `noreply@hospital.com`
- Office365: `user@hospital.onmicrosoft.com`

**Example:**
```
noreply@hospital.com
```

---

### 6. MAIL_PASSWORD

**Purpose:** SMTP authentication password or app-specific token

**Important:** 
- ⚠️ **NOT your Gmail password!** Use App Password instead
- ⚠️ Store as GitHub Secret, never commit to code
- For Gmail 2FA accounts: Generate App Password from Security Settings

**Gmail Instructions:**
1. Go to: https://myaccount.google.com/apppasswords
2. Select: Mail & Windows Computer (or custom app)
3. Generate app password
4. Copy 16-character password
5. Use as `MAIL_PASSWORD` (without spaces)

**Example:**
```
abcdefghijklmnop
```

---

## 🔧 Email Service Configuration

### Gmail (Free - Recommended for Testing)

```
MAIL_SERVER = smtp.gmail.com
MAIL_PORT = 587
MAIL_USERNAME = your-email@gmail.com
MAIL_PASSWORD = [app-password-16-chars]
SECURITY_EMAIL = recipient@hospital.com
```

**Setup:**
1. Enable 2-Factor Authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use 16-character app password as `MAIL_PASSWORD`

---

### Office 365 / Microsoft 365

```
MAIL_SERVER = smtp.office365.com
MAIL_PORT = 587
MAIL_USERNAME = user@hospital.onmicrosoft.com
MAIL_PASSWORD = [office-365-password]
SECURITY_EMAIL = security@hospital.com
```

**Note:** 
- Some security policies may require app-specific passwords
- Check with your Office 365 administrator

---

### AWS SES (Scalable Production)

```
MAIL_SERVER = email-smtp.us-east-1.amazonaws.com
MAIL_PORT = 587
MAIL_USERNAME = [SMTP username from AWS console]
MAIL_PASSWORD = [SMTP password from AWS console]
SECURITY_EMAIL = noreply@hospital.com
```

**Setup:**
1. Verify email domain in SES
2. Create SMTP credentials in SES console
3. Generate credentials (creates username + password)
4. Copy to GitHub Secrets

---

### Custom SMTP Server

```
MAIL_SERVER = mail.yourdomain.com
MAIL_PORT = 587
MAIL_USERNAME = noreply@yourdomain.com
MAIL_PASSWORD = [server-password]
SECURITY_EMAIL = security@yourdomain.com
```

---

## ✅ Verification Checklist

After setting up secrets:

- [ ] At least one notification method configured (Slack OR Email)
- [ ] `SECURITY_EMAIL` set if using email
- [ ] `SLACK_WEBHOOK_URL` set if using Slack
- [ ] For email: `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` all set
- [ ] Secrets are not visible in GitHub (they're encrypted)
- [ ] No secrets committed to repository

---

## 🧪 Testing Notifications

### Test Email Notifications

1. Manually trigger workflow:
   - Go to: Actions → Enhanced Security Scan
   - Click: Run workflow
   - Select: Branch → Dispatch

2. Check email inbox for test message

3. If not received:
   - Check spam folder
   - Verify credentials
   - Check SMTP logs

### Test Slack Notifications

1. Use `curl` to test webhook:
```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{
    "text": "Test message from EWTCS",
    "blocks": [{
      "type": "section",
      "text": {"type": "mrkdwn", "text": "*EWTCS Security Test*"}
    }]
  }' \
  YOUR_SLACK_WEBHOOK_URL
```

2. If you see message in Slack, webhook is working

3. If not received:
   - Verify webhook URL copied correctly
   - Check URL hasn't expired
   - Re-generate webhook if needed

---

## 🆘 Troubleshooting

### Email Not Sending

**Check:**
1. Secret is set in GitHub
2. Email service credentials correct
3. Firewall allows SMTP outbound
4. Account doesn't have 2FA blocking
5. SMTP port is correct (587 for TLS, 465 for SSL)

**Solution:**
```bash
# Test SMTP connection locally
telnet smtp.gmail.com 587

# For Gmail, verify app password works
```

### Slack Hook Not Working

**Check:**
1. Webhook URL copied completely
2. URL doesn't have special characters that need escaping
3. Webhook hasn't expired in Slack
4. Channel still exists and bot has access

**Solution:**
1. Re-generate webhook in Slack
2. Copy again (including full URL)
3. Test with curl command above

### Credentials Keep Failing

**Check:**
1. Secret name spelled correctly (case-sensitive)
2. Value doesn't have leading/trailing spaces
3. Special characters aren't escaped differently
4. Password hasn't changed

**Solution:**
1. Delete secret and re-create
2. Copy value from service again
3. Verify no accidental spaces

---

## 🔒 Security Best Practices

1. **Never commit secrets to code**
   - Use GitHub Secrets exclusively
   - Add pattern to `.gitignore` if needed

2. **Rotate credentials periodically**
   - Change email passwords quarterly
   - Re-generate Slack webhooks if compromised

3. **Use app-specific passwords**
   - Gmail: Use app passwords, not account password
   - Office 365: Consider app passwords for service accounts

4. **Limit webhook scope**
   - Slack: Create separate webhook for `#security-alerts`
   - Don't use general company webhook

5. **Audit access**
   - Only necessary users can view/edit secrets
   - GitHub logs all secret access

---

## 📝 Example Full Configuration

**Production Setup:**

```
SECURITY_EMAIL = security@hospital.com
SLACK_WEBHOOK_URL = https://hooks.slack.com/services/T1234567890/B0987654321/XXXXXXXXXXXXXXXX
MAIL_SERVER = smtp.office365.com
MAIL_PORT = 587
MAIL_USERNAME = noreply@hospital.onmicrosoft.com
MAIL_PASSWORD = [Office 365 app password]
```

**Minimal Setup (Slack Only):**

```
SLACK_WEBHOOK_URL = https://hooks.slack.com/services/T1234567890/B0987654321/XXXXXXXXXXXXXXXX
```

**Gmail Testing:**

```
SECURITY_EMAIL = security@hospital.com
MAIL_SERVER = smtp.gmail.com
MAIL_PORT = 587
MAIL_USERNAME = noreply@gmail.com
MAIL_PASSWORD = [16-char app password]
```

---

## 📞 Support

If secrets aren't working:

1. Check this guide again
2. Verify values copied exactly (no spaces)
3. Test external service first (curl, telnet)
4. Check GitHub Actions logs for specific error
5. Contact: `security@hospital.com`

---

*Last Updated: March 3, 2026 | EPIC 17: Security & Privacy*
