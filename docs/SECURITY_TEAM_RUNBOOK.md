# Security Team Runbook

**EPIC 17: Security & Privacy**

Step-by-step procedures for responding to EWTCS security scan alerts.

---

## 🚨 When You Receive a Security Alert

### Step 1: Immediate Assessment (5 minutes)

**What to do:**

1. Check the alert source:
   - 📧 Email from `EWTCS Security Scan`
   - 🔔 Slack notification in `#security-alerts`
   - 📝 GitHub Issue created automatically

2. Determine severity:
   - 🔴 **RED** = Critical (requires 48-hour fix)
   - 🟠 **ORANGE** = High (requires 7-day fix)
   - 🟡 **YELLOW** = Medium (requires 30-day fix)
   - 🟢 **GREEN** = Low (requires 90-day fix)

3. Assign to team member based on severity:
   - **Critical**: Immediate escalation to on-call engineer
   - **High**: Priority to senior engineer
   - **Medium/Low**: Assign to next available engineer

---

### Step 2: Download & Review Report (15 minutes)

**Where to find it:**

Option A – Email
- Download JSON attachment from security scan email

Option B – GitHub
1. Go to: `https://github.com/[owner]/EWTCS/actions`
2. Click: `Enhanced Security Scan` workflow
3. Find most recent run
4. Click: `Artifacts` section
5. Download: `security-scan-reports-*.zip`

Option C – GitHub Issue
1. Go to: `https://github.com/[owner]/EWTCS/issues`
2. Find issue: `🔴 CRITICAL: X Critical Vulnerabilities Found`
3. Click: Run details link
4. Download artifacts

**What to review:**

```json
{
  "vulnerabilities": [
    {
      "packageName": "package-name",
      "severity": "critical",
      "title": "Vulnerability description",
      "fixAvailable": true,
      "fixedInVersion": "1.2.3",
      "range": "< 1.2.3"
    }
  ],
  "metadata": {
    "vulnerabilities": {
      "critical": 2,
      "high": 5,
      "medium": 10,
      "low": 15
    }
  }
}
```

---

### Step 3: Categorize Vulnerabilities (10 minutes)

Create a spreadsheet or GitHub issue with:

| Package | Severity | Fixable? | Version Fix | Blockers | Assigned To |
|---------|----------|----------|-------------|----------|-------------|
| lodash | critical | Yes | 4.17.21 | None | John |
| axios | high | No | TBD | Waiting upstream | Sarah |

**Questions to answer:**

1. **Is it fixable?**
   - Yes → Run `npm audit fix`
   - No → Check upstream for patches

2. **What's the impact?**
   - Direct dependency? Higher priority
   - Transitive? Lower priority (may fix automatically)

3. **Are there blockers?**
   - Breaking changes?
   - Dependency conflicts?
   - Waiting for upstream fix?

---

### Step 4: Create Fix Plan (15 minutes)

**For CRITICAL (48-hour SLA):**

**Option A – Automatic Fix**
```bash
cd EWTCS
npm audit fix                    # Auto-fix what it can
npm test                         # Verify no breakage
npm audit                        # Re-check status
```

**Option B – Manual Fix**
```bash
npm update package-name@latest
npm test
npm audit
```

**Option C – Workaround**
```
- Document reason for delay
- Create GitHub issue with mitigation plan
- Set waiver if appropriate (requires approval)
- Monitor for upstream fix
```

**For HIGH (7-day SLA):**

1. Schedule fix for next sprint
2. Add to backlog priority list
3. Update timeline in SLA tracker

---

### Step 5: Test Changes (20 minutes)

Before committing:

```bash
# 1. Run full test suite
npm test

# 2. Run security audit again
npm audit --json

# 3. Check for breaking changes
npm outdated              # See what changed
git diff package.json    # Review modifications
git diff package-lock.json

# 4. Run linting
npm run lint

# 5. Manual verification
npm run dev              # Test in development
# Browse and test features manually
```

---

### Step 6: Commit & Deploy (10 minutes)

```bash
# Create feature branch
git checkout -b fix/security-vulnerabilities-2026-03-03

# Commit changes
git add package.json package-lock.json
git commit -m "fix: resolve npm security vulnerabilities

- Updated lodash 4.17.20 → 4.17.21 (critical)
- Updated axios 1.1.0 → 1.2.3 (high)
- Verified all tests pass
- No breaking changes introduced

Fixes GitHub issue #XYZ
SLA deadline: 2026-03-05"

# Push and create PR
git push origin fix/security-vulnerabilities-2026-03-03
```

**On GitHub:**
1. Create Pull Request
2. Title: `fix: resolve critical security vulnerabilities`
3. Description: Include scan summary and fix details
4. Add labels: `security`, `critical`
5. Request review from another engineer

---

### Step 7: Verify Resolution (5 minutes)

After PR merged (when scan runs again):

1. Run manual scan:
```bash
npm audit
```

2. Confirm vulnerabilities gone:
```bash
npm audit --json | grep -c "critical"  # Should be 0
```

3. Update SLA tracking:
   - Mark as "FIXED"
   - Record fix date
   - Note any issues encountered

4. Close GitHub issue:
   - Comment: "✅ Fixed in PR #[number]"
   - Reference: commit hash

---

## 📋 SLA Tracking Template

Use this to track vulnerability fixes:

```markdown
## Security SLA Tracker - Week of March 3, 2026

### Critical (48-hour deadline)
- [ ] lodash 4.17.20 → 4.17.21
  - Found: 2026-03-03
  - Deadline: 2026-03-05 09:00 UTC
  - Status: FIXED (PR #123)

### High (7-day deadline)
- [ ] axios 1.1.0 → 1.2.3
  - Found: 2026-03-03
  - Deadline: 2026-03-10 09:00 UTC
  - Status: IN PROGRESS (PR #124)

### Medium (30-day deadline)
- [ ] eslint 9.0 → 9.39
  - Found: 2026-03-03
  - Deadline: 2026-04-02 09:00 UTC
  - Status: BACKLOG

### Low (90-day deadline)
- [ ] miscellaneous packages
  - Found: 2026-03-03
  - Deadline: 2026-06-01 09:00 UTC
  - Status: BACKLOG
```

---

## 🆘 Common Scenarios

### Scenario 1: Package Won't Update (Conflicts)

```
Error: npm ERR! npm audit fix failed to automatically fix the vulnerabilities.
```

**Solution:**

```bash
# 1. Review the dependency tree
npm ls package-name

# 2. Try manual update with specific version
npm install package-name@specific-version --save

# 3. If still conflicts, update parent dependency
npm update parent-dependency

# 4. If still stuck, file issue and document workaround
```

---

### Scenario 2: Critical Vulnerability But No Fix Available

**Steps:**

1. Document in GitHub issue:
   - Why no fix is available
   - Expected patch date
   - Mitigation in place

2. Escalate to engineering lead

3. Consider alternatives:
   - Switch to different package?
   - Add security monitoring?
   - Implement workaround?

4. Request waiver from security lead with justification

---

### Scenario 3: SLA Deadline Approaching

**At 24 hours before deadline:**

1. Status check: `npm audit`

2. If still vulnerable:
   - Escalate immediately to lead
   - Activate contingency plan
   - Document need for waiver

3. If fixed:
   - Verify deployment to production
   - Update SLA tracker
   - Close issue

---

### Scenario 4: False Positive

**Example:** Vulnerability in test-only dependency

**Steps:**

1. Confirm it's a false positive
2. File issue with advisory source
3. Document justification
4. Add exception (if appropriate):
   ```bash
   npm install --save-dev <package> --depth=false
   npm audit --production  # Excludes dev deps
   ```

---

## 📊 Weekly Security Report Template

**Prepare this for management review:**

```markdown
# EWTCS Security Report — Week of March 3, 2026

## Executive Summary
- ✅ **Scans Completed**: 1/1 (100%)
- 🔴 **Critical**: 2 Found, 2 Fixed (100%)
- 🟠 **High**: 5 Found, 3 Fixed (60%)
- 📈 **SLA Compliance**: 100%

## Vulnerabilities
| Severity | Found | Fixed | In Progress | Deadline | Status |
|----------|-------|-------|-------------|----------|--------|
| Critical | 2 | 2 | 0 | 2026-03-05 | ✅ CLEAN |
| High | 5 | 3 | 2 | 2026-03-10 | ⚠️ ON TRACK |

## Issues Resolved
- ✅ lodash security update (PR #123)
- ✅ axios update (PR #124)

## Recommendations
1. Continue weekly scans
2. Monitor Dependabot PRs
3. Major version update for Next.js pending

## Next Steps
1. Review remaining high-severity items
2. Plan Next.js major version upgrade
3. Schedule security review for Q2
```

---

## 🔗 Quick Reference

| Action | Command | Time |
|--------|---------|------|
| Check vulnerabilities | `npm audit` | 1 min |
| Auto-fix | `npm audit fix && npm test` | 5 min |
| Verify fix | `npm audit --json \| grep critical` | 1 min |
| Check outdated | `npm outdated` | 1 min |
| View history | See `.security-scan-archive/HISTORY.md` | 1 min |

---

## 📞 Escalation Path

```
Alert Received
     ↓
[Assess Severity]
     ↓
🔴 CRITICAL → On-Call Engineer (Immediate)
🟠 HIGH → Senior Engineer (24 hours)
🟡 MEDIUM → Next Available (1 week)
🟢 LOW → Backlog (3 months)
     ↓
[Implement Fix]
     ↓
[Test & Deploy]
     ↓
[Verify & Close]
```

**Escalation Contacts:**
- **On-Call**: `@oncall-security` (Slack)
- **Engineering Lead**: `@engineering-lead`
- **Security Lead**: `@security-lead`
- **Management**: `security@hospital.com`

---

## ✅ Checklist: Full Response to Alert

- [ ] Alert received and reviewed
- [ ] Severity assessed and assigned
- [ ] Report downloaded and analyzed
- [ ] Fix plan created
- [ ] Changes tested locally
- [ ] Commit created with details
- [ ] PR created and reviewed
- [ ] PR merged to main
- [ ] Production deployment verified
- [ ] Latest scan confirms fix
- [ ] SLA tracker updated
- [ ] GitHub issue closed
- [ ] Team notified of resolution

---

*Last Updated: March 3, 2026 | EPIC 17: Security & Privacy*
