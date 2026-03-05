# Admin Training Slides: EWTCS Administration Console

## Module 1: Admin Role Overview
### Your Responsibilities as System Administrator
- **User Lifecycle**: Create, activate, and deactivate all staff accounts.
- **System Configuration**: Manage beds, stages, wards, and delay reason options.
- **Oversight**: Monitor system adoption and review audit trails.
- **AI Reports**: Trigger and review daily AI summaries.

> [!IMPORTANT]
> The Admin role has full write access. Every action is permanently logged in the audit trail.

---

## Module 2: User Management
### Creating & Managing Staff Accounts
- Navigate to **Admin Console → User Management**.
- Click **"Create User"** to add a new staff member.
- Assign a **Role**: `nurse`, `housekeeping`, `supervisor`, `auditor`, or `admin`.
- Assign a **Ward** (optional — restricts bed access by ward).
- Use **Activate / Deactivate** to control access without deleting accounts.
- Use **Reset Password** to issue a temporary password; the user must change it on first login.

> [!NOTE]
> Deactivated accounts cannot log in. All their historical actions remain in the audit trail.

---

## Module 3: Bed & Stage Configuration
### Keeping the Dashboard Accurate
- Navigate to **Admin → Beds** to add, edit, or remove physical beds.
- Navigate to **Admin → Stages** to configure workflow stages and their color codes.
- Navigate to **Admin → Delay Reasons** to manage the list of delay reason options nurses see.
- Navigate to **Admin → Wards** to configure ward groupings for multi-ward deployments.

> [!TIP]
> Adding new beds takes immediate effect on all active dashboards.

---

## Module 4: AI Daily Summary Management
### Triggering and Monitoring AI Reports
- The AI summary auto-generates every night at **midnight IST**.
- To trigger manually: Click **"Generate Today's Summary"** on the Admin page.
- View recent summaries in the **Daily Summary History** panel.
- Summaries require Supervisor approval before reaching Management.
- If `GEMINI_API_KEY` is not set, a placeholder report is generated instead.

---

## Module 5: System Adoption Dashboard
### Monitoring Staff Usage
- Navigate to **Admin → System Adoption** to view usage metrics.
- **KPI Cards**: Total logins today, this week, and this month; bed updates; reports generated.
- **Usage Trend Chart**: 30-day daily login trend — identify declining engagement.
- **Low-Usage Alert**: Lists users with no login in the past 7 days — flag for follow-up training.
- **Monthly Report**: Trends broken down by month and action type.
- Use this dashboard after every training session to confirm new staff are actively using the system.

---

## Module 6: Audit Trail & Compliance
### Every Action is Logged
- All logins, stage changes, overrides, and admin actions are permanently recorded in `audit_logs`.
- Auditors (separate role) have read-only access to the full audit trail.
- The audit trail **cannot be deleted or altered** via the UI.
- Access the Auditor View from the Analytics page if granted auditor role.

> [!CAUTION]
> Never share admin credentials. Each staff member must have their own account so the audit trail is accurate.

---

## Module 7: Security & Account Hygiene
### Best Practices
- Enforce **strong passwords** and rotate every 90 days.
- Deactivate accounts immediately when a staff member leaves.
- Avoid using the `admin` account for routine daily ward work — create role-specific accounts.
- Review the **Recent Activity** panel on the Admin dashboard daily for anomalies.
- In production: ensure `SESSION_SECRET` and `ENCRYPTION_KEY` are set and rotated annually.

---

## Summary
- **Users**: You create and manage every account.
- **Configuration**: You control what appears on the ward dashboard.
- **Oversight**: The adoption dashboard tells you whether staff are actually using the system.
- **Compliance**: The audit trail is your safety net.
- **Support**: If something does not look right technically, contact the system owner at somuyakhandelwal@gmail.com.
