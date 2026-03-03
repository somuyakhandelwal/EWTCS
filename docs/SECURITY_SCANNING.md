# Automated Security Scanning — EWTCS

**EPIC 17: Security & Privacy**

The EWTCS implements comprehensive automated vulnerability scanning with SLA tracking, reporting, and escalation procedures.

---

## 🎯 Overview

The security scanning system:

- ✅ **Scans weekly** (every Monday) + on every PR
- ✅ **Detects vulnerabilities** using npm audit
- ✅ **Tracks SLAs** with automatic deadline calculation
- ✅ **Notifies** security team via Slack & email
- ✅ **Escalates** critical issues automatically
- ✅ **Archives** historical scan data
- ✅ **Updates dependencies** via Dependabot

---

## 📊 Scan Types

### 1. NPM Audit (Weekly + On PR)

Scans for known vulnerabilities in npm packages.

```bash
npm audit --json
```

**Severity Levels:**
- 🔴 **Critical**: Fix within 48 hours
- 🟠 **High**: Fix within 7 days
- 🟡 **Medium**: Fix within 30 days
- 🟢 **Low**: Fix within 90 days

---

### 2. Dependency Review (On PR)

GitHub's automated dependency review for PRs.

**Blocks PR if:**
- Any new HIGH severity vulnerabilities introduced
- Any new CRITICAL vulnerabilities

---

### 3. Outdated Packages (Weekly)

Identifies packages that have newer versions available.

```bash
npm outdated --json
```

---

## 🔄 Scan Schedule

| Type | Trigger | Frequency |
|------|---------|-----------|
| npm audit | Schedule | Weekly, Monday 00:00 UTC |
| npm audit | Push to main | On commit |
| npm audit | Pull Request | On PR to main |
| Dependency Review | PR | On PR to main |
| Outdated packages | Schedule | Weekly, Monday 00:00 UTC |

---

## 📋 Workflows & Actions

### Enhanced Security Scan (`security-scan-enhanced.yml`)

Main scanning workflow with detailed output and archival.

**Triggers:**
- Weekly schedule (Monday 00:00 UTC)
- Push to main
- Manual PR
- Manual workflow dispatch

**Outputs:**
- Detailed JSON report
- Outdated packages report
- GitHub Issue (if critical vulns)
- PR comment with results
- Artifact archive (90 days retention)

**Key Features:**
- Parses npm audit JSON
- Calculates SLA deadlines
- Creates urgent GitHub issues for critical vulns
- Comments on PRs with results
- Blocks PR merge if critical vulns detected
- Archives scans to history

---

### Security Notifications (`security-notify.yml`)

Sends notifications to security team when vulnerabilities detected.

**Notifications Sent:**
- 🔔 **Slack**: Real-time alert with scan result
- 📧 **Email**: Detailed report for manual review
- 📝 **GitHub Issue**: For critical vulnerabilities

**Notification Triggers:**
- Critical vulnerabilities found
- High-severity vulnerabilities found
- SLA breached (via scheduled check)

---

### Dependabot Configuration (`dependabot.yml`)

Automatic dependency updates via GitHub Dependabot.

**Update Schedule:**
- **npm packages**: Weekly, Monday 03:00 UTC
- **GitHub Actions**: Weekly, Monday 04:00 UTC

**Behaviors:**
- Max 10 open npm update PRs
- Max 5 open action update PRs
- Auto-rebase on main
- Ignores major version updates (require manual review)
- Assigned to maintainer for review

---

## 🛠️ Manual Scanning

To manually run security scans:

```bash
# Run npm audit
npm audit --json

# Check for outdated packages
npm outdated --json

# Auto-fix fixable vulnerabilities
npm audit fix

# Update specific package
npm update <package-name>
```

---

## 📊 Scan Report Formats

Reports are generated in multiple formats:

### 1. GitHub Artifacts

Available in GitHub Actions UI for 90 days.

**Files:**
- `audit-report.json` — Full npm audit output
- `outdated-report.json` — Outdated packages

### 2. Markdown Report

Human-readable markdown format with summary tables.

**Contains:**
- Vulnerability summary by severity
- SLA status
- Breached items list
- Critical vulnerabilities
- Recommendations

### 3. HTML Report

Formatted HTML email and web view.

**Includes:**
- Styled tables
- Color-coded severity badges
- Timeline information

### 4. JSON Report

Structured data for programmatic access.

**Schema:**
```json
{
  "scan": { ... },
  "slaSummary": { ... },
  "breachedItems": [ ... ],
  "generatedAt": "ISO timestamp"
}
```

---

## 🚨 SLA Tracking

Each vulnerability has a Service Level Agreement (SLA) deadline:

```
Found Date → Deadline
─────────────────────
Critical   48 hours
High       7 days
Medium     30 days
Low        90 days
```

**SLA Status:**
- ✅ **Open** — Within deadline
- ⚠️ **Warning** — Within 24 hours
- 🔴 **Breached** — Past deadline

---

## 📧 Notifications

### Slack Alerts

Sent to `#security-alerts` channel (if configured).

```
🔒 Security Scan Alert
🚨 CRITICAL: 2 critical vulnerabilities found!
Action Required: Review and prioritize fixes
[View Scan] button links to GitHub Actions
```

### Email Reports

Sent to **`SECURITY_EMAIL`** (configured in GitHub Secrets).

**Contents:**
- Executive summary
- Vulnerability breakdown
- SLA status
- Action items
- Link to full report

---

## ⚙️ Configuration

### GitHub Secrets Required

Configure these secrets in `Settings → Secrets and Variables`:

```
SECURITY_EMAIL              # Email address for notifications
SLACK_WEBHOOK_URL          # Slack webhook for alerts (optional)
MAIL_SERVER                # SMTP server (optional)
MAIL_PORT                  # SMTP port (default 587)
MAIL_USERNAME              # SMTP username
MAIL_PASSWORD              # SMTP password
```

### SLA Configuration

Edit in `src/features/security-scanning/lib/sla-tracker.ts`:

```typescript
const DEFAULT_SLA_HOURS = {
  critical: 48,
  high: 168,    // 7 days
  medium: 720,  // 30 days
  low: 2160,    // 90 days
}
```

---

## 🔐 Security Team Responsibilities

When a scan alert is received:

### 1. Review Findings (Within 24 hours)

- Download detailed report from GitHub Actions
- Identify fixable vs. unfixable vulnerabilities
- Assign severity and priority
- Create action items

### 2. Take Action (Based on SLA)

**For Fixable Vulnerabilities:**
```bash
npm audit fix
npm test
git commit -m "fix: address npm vulnerabilities"
```

**For Unfixable:**
- Document why it cannot be fixed
- Create mitigation plan
- Set waiver if appropriate
- Monitor for patch availability

### 3. Track Progress

- Update SLA tracker with fix status
- Monitor deadline approaches
- Escalate breached items to management
- Document fixes in audit trail

### 4. Verify Resolution

- Re-run scan after fixes
- Confirm vulnerabilities resolved
- Close GitHub issue
- Update SLA tracking

---

## 📈 Reporting

### Weekly Report

Review `Security Scan History` in `.security-scan-archive/HISTORY.md`:

```markdown
| Date       | Critical | High | Medium | Low | Status |
|------------|----------|------|--------|-----|--------|
| 2026-03-03 | 0        | 2    | 5      | 12  | ⚠️     |
| 2026-02-24 | 0        | 1    | 4      | 10  | ✅     |
```

### Monthly Summary

Aggregate trends:
- Vulnerability trends over time
- SLA compliance rate
- Average fix time
- Most common vulnerability types

---

## 🚀 Best Practices

1. **Review PRs with vulnerabilities carefully**
   - Check if new requirements introduce vulns
   - Request updates if needed

2. **Keep dependencies up-to-date**
   - Review Dependabot PRs weekly
   - Merge non-breaking updates promptly
   - Test major version updates in staging

3. **Monitor SLA deadlines**
   - Set calendar reminders for critical items
   - Escalate early if deadline at risk
   - Document blockers

4. **Report trends to management**
   - Share monthly security metrics
   - Highlight improvements/regressions
   - Discuss long-term strategy

---

## 🆘 Troubleshooting

### Scan Not Running

**Check:**
- GitHub Actions enabled in repository
- Workflow file syntax is correct
- Schedule is set correctly

**Fix:**
```bash
# Manually trigger scan
# Go to: Actions → Enhanced Security Scan → Run workflow
```

### Notifications Not Sending

**Check:**
- GitHub Secrets are configured correctly
- Email/Slack credentials are valid
- Firewall allows outbound connections

**Test:**
```bash
# Manual trigger with test data
# Edit workflow to test email configuration
```

### False Positives

**Actions:**
- Document false positive in issue
- File CVE query with advisory source
- Set waiver with documentation
- Monitor for upstream fix

---

## 📚 Related Documentation

- [SECURITY.md](../../SECURITY.md) — Security policy & reporting
- [SECURITY_TEAM_RUNBOOK.md](SECURITY_TEAM_RUNBOOK.md) — Step-by-step procedures
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — Development security guidelines

---

## 📞 Support

For questions or issues:

1. Check this documentation first
2. Review GitHub Issues for similar problems
3. Contact: `security@hospital.com`
4. Escalate to: `@security-lead`

---

*Last Updated: March 3, 2026 | EPIC 17: Security & Privacy*
