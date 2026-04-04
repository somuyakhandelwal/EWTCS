# EWTCS — Migration Reference

> **Quick Rule:** `node-pg-migrate` tracks applied migrations **by filename**, not by number prefix.  
> Duplicate-numbered files are safe — each unique filename is tracked independently.

---

## Migration Runner

```bash
# Apply all pending migrations
npm run db:migrate

# Check migration status
npm run db:migrate -- --dry-run
```

Migrations live in `migrations/` and are run in **lexicographic filename order**.

---

## Full Migration Inventory (68 files)

| File | Purpose |
|------|---------|
| `001_init.sql` | UUID extension, users table, user_role enum (nurse/supervisor/admin) |
| `002_add_user_lockout.sql` | failed_login_attempts, lockout_until columns |
| `003_add_user_management.sql` | is_active, updated_at, ward_id on users |
| `004_generic_audit_logs.sql` | audit_logs table |
| `005_create_beds_and_stages.sql` | stages, beds, bed_stage_logs tables + 8 default stages |
| `006_add_ward_access_control.sql` | wards table |
| `007_create_bed_stage_log_corrections.sql` | bed_stage_log_corrections table |
| `008_add_bed_stage_log_immutability.sql` | DB triggers preventing audit_log tampering |
| `009_token_blacklist.sql` | token_blacklist table for JWT revocation |
| `010_create_stage_transitions.sql` | stage_transitions table (valid transition rules) |
| `011_add_disposition_bottleneck.sql` | disposition_delay_reasons table |
| `012_add_us17_delay_reasons.sql` | Delay reason options |
| `013_create_patient_admissions.sql` | patient_admissions archival table |
| `014_add_kiosk_sessions.sql` | kiosk_sessions table for IP-bound kiosk mode |
| `015_add_password_reset.sql` | must_change_password, temp_password_set_at on users |
| `015_add_tat_to_admissions.sql` | ⚠️ Duplicate number — adds TAT columns to patient_admissions (runs AFTER _password_reset due to filename sort) |
| `016_add_tat_to_admissions.sql` | Corrective migration ensuring TAT columns exist (safe IF NOT EXISTS guards) |
| `017_add_temporary_beds.sql` | is_virtual, is_temporary columns on beds |
| `018_create_shifts.sql` | shifts table |
| `019_add_shift_id_to_logs.sql` | shift_id FK on bed_stage_logs |
| `020_create_system_settings.sql` | system_settings key/value table |
| `021_create_stage_delay_thresholds.sql` | stage_delay_thresholds table |
| `022_add_performance_indexes.sql` | Composite indexes for N+1 elimination (EPIC 13) |
| `023_create_daily_summaries.sql` | daily_summaries table |
| `024_add_housekeeping_role_and_stages.sql` | housekeeping role added to user_role enum |
| `025_add_audit_log_ip_and_immutability.sql` | IP address + enhanced immutability on audit_logs |
| `026_add_auditor_role.sql` | auditor role added to user_role enum |
| `027_add_virtual_beds.sql` | Additional virtual bed support |
| `028_create_archival_tables.sql` | archival_bed_stage_logs, archival_patient_admissions, archival_runs |
| `029_seed_retention_settings.sql` | Default data retention settings in system_settings |
| `030_create_report_signoffs.sql` | report_signoffs table |
| `031_archive_bed_stage_logs.sql` | Archival stored procedures |
| `032_enforce_stage_log_retention_and_immutability.sql` | Retention enforcement triggers |
| `033_add_ai_summary_column.sql` | ai_summary column on daily_summaries |
| `034_daily_summary_workflow_and_insights.sql` | Additional daily_summary columns |
| `035_archive_retrieval_storage.sql` | Archive retrieval tables/views |
| `037_fix_stage_transitions.sql` | Repair for stage_transitions data (036 was skipped/removed) |
| `038_add_delay_reason_options.sql` | Admin-configurable delay reasons |
| `038_create_alert_preferences.sql` | ⚠️ Duplicate number — alert_preferences table |
| `039_create_error_events.sql` | error_events table for system-level error monitoring |
| `040_create_user_feedback.sql` | user_feedback table |
| `040_enable_pgcrypto.sql` | ⚠️ Duplicate number — enables pgcrypto extension |
| `041_add_encrypted_patient_columns.sql` | Encrypted PHI columns on beds (EPIC 17) |
| `042_add_encrypted_users_columns.sql` | email_encrypted, full_name_encrypted on users |
| `043_add_encrypted_bed_stage_log_columns.sql` | Encrypted columns on bed_stage_logs |
| `044_add_encrypted_audit_log_columns.sql` | Encrypted columns on audit_logs |
| `045_create_ot_rooms.sql` | ot_rooms table (EPIC 23) |
| `046_add_patient_demographics_to_beds.sql` | patient_uhid, key_symptom, triage_level, etc. on beds (US-21.1) |
| `047_add_cath_lab_roles.sql` | cath_lab_nurse role added to user_role enum |
| `047_add_doctor_and_cardiologist_roles.sql` | ⚠️ Duplicate number — doctor + cardiologist roles added |
| `047_enforce_symptom_40_char_limit.sql` | ⚠️ Duplicate number — 40-char constraint on key_symptom |
| `048_create_er_intake_table.sql` | er_intake table (EPIC 20 — US-20.1) |
| `049_create_diagnosis_table.sql` | diagnosis table (EPIC 20 — US-20.2) |
| `050_create_ot_procedures_table.sql` | ot_procedures table (EPIC 20 — US-20.3) |
| `052_repair_ot_rooms_dependency.sql` | Repair migration for ot_rooms FK dependencies (051 skipped) |
| `054_repair_stage_transitions_table.sql` | Repair migration for stage_transitions (053 skipped) |
| `056_create_cath_lab_procedures.sql` | Initial minimal cath_lab_procedures table (CAG/PTCA enum approach) |
| `056_seed_emergency_ward.sql` | ⚠️ Duplicate number — seeds Emergency Ward (code: ER) into wards |
| `057_create_cath_lab_procedures_table.sql` | Drops the 056 minimal table, recreates with full EPIC 24 schema |
| `057_extend_cath_lab_procedures.sql` | ⚠️ Duplicate number — extends cath_lab_procedures (runs if 056 was original minimal) |
| `058_repair_cath_lab_procedures_columns.sql` | Final repair pass on cath_lab_procedures columns |
| `1740649700000_add-performance-indexes.js` | JS migration — additional performance indexes |
| `1771680144644_add-escalation-threshold.js` | JS migration — escalation_threshold_minutes setting |
| `1773770454739_add-triage-columns-to-beds.js` | JS migration — triage columns on beds |
| `1773838271566_create-department-metrics-tables.js` | JS migration — **no-op** (canonical SQL migrations 048/050 own these tables) |
| `1773855000000_seed_triage_area_beds.sql` | Seeds Triage Area ward and beds |
| `1774000000000_enforce_symptom_40_char_limit_after_triage.sql` | Re-enforces 40-char symptom constraint after triage columns added |
| `1774239900000_ot_procedure_tracking_constraints.sql` | surgeon_id made nullable; unique index for one active OT per room |

---

## Known Duplicate Numbers

These arose from parallel team development. They are **not a bug** — `node-pg-migrate` tracks by filename, so each file is applied once and only once.

| Number | Files | Situation |
|--------|-------|-----------|
| 015 | `015_add_password_reset.sql`, `015_add_tat_to_admissions.sql` | Different features, lexicographic order applies |
| 038 | `038_add_delay_reason_options.sql`, `038_create_alert_preferences.sql` | Different features |
| 040 | `040_create_user_feedback.sql`, `040_enable_pgcrypto.sql` | Different features |
| 047 | `047_add_cath_lab_roles.sql`, `047_add_doctor_and_cardiologist_roles.sql`, `047_enforce_symptom_40_char_limit.sql` | 3 features merged by different devs |
| 056 | `056_create_cath_lab_procedures.sql`, `056_seed_emergency_ward.sql` | Different purposes |
| 057 | `057_create_cath_lab_procedures_table.sql`, `057_extend_cath_lab_procedures.sql` | One replaces the other |

> **Do NOT renumber or delete applied migrations.** The migration runner tracks them by filename. Renaming a file that has already been applied in production will cause it to be re-run, potentially breaking the database.

---

## Gap in Sequence

| Gap | Reason |
|-----|--------|
| 036 | Removed/superseded — `037_fix_stage_transitions.sql` is the corrective |
| 051, 053, 055 | Renumbered during team development; covered by subsequent repair migrations |

---

## Adding New Migrations

Always use the next available **unique** number. Check the list above before creating a file.

```bash
# Correct pattern
migrations/059_your_new_feature.sql

# Or use a timestamp if working in parallel branches
migrations/1774999999999_your_feature.sql
```
