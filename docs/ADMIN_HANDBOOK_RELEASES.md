# EWTCS Admin Handbook — Release Notes

Per-release operational notes. See [ADMIN_HANDBOOK.md](./ADMIN_HANDBOOK.md) for the main runbook.

---

## EPIC 25 — ER Bed Workflow Triage Removal
- New migrations (all new files, no existing migrations modified):
  - `062_us25_2_er_stage_repair.sql` — standardizes ER workflow to use the 8 approved ER stages
  - `063_remove_triage_from_er.sql` — deactivates Triage stage and all related transition rules
- Deactivated Legacy Stages (not deleted — historical audit/log integrity is preserved):
  - `Triage`, `Registration`, `Doctor Assessment`, `Treatment/Observation`
- Approved Active ER Stages (8 stages):
  - `Empty`, `Initial Investigation`, `Initial Treatment`, `Drugs/Test`, `Observation`, `Decision Made`, `Discharge Process`, `Cleaning`
- Code Changes:
  - Refactored `src/features/bed-dashboard/actions/bed-grid-actions.ts` to stay within the 200-line limit.
  - New library: `src/features/bed-dashboard/lib/triage-wards.ts` — cached DB query for triage ward IDs.
- Deployment steps:
  1. Run `npm run db:migrate` to apply all new migrations.
  2. Verify migration status: `npm run validate:migrations`.
  3. Verify schema integrity: `npm run validate:schema`.
  4. Confirm `/api/health` returns `status: healthy`.

---

## Migration Validation Policy Notes
- CI migration duplicate-prefix allowlist: `scripts/lib-migration-duplicate-check.js`.
- Approved duplicate prefix groups: `015`, `038`, `040`, `047`, `058`.
- `scripts/validate-migrations.js` consumes that allowlist during `npm run validate:migrations`.

---

## EPIC 20 — Department Modules (ER, Diagnosis, OT, Cath Lab)
- **Schema Additions**: Four new tables (`er_intake`, `diagnosis`, `ot_procedures`, `cath_lab_procedures`).
- **Roles**: Added `doctor`, `cardiologist`, and `cath_lab_nurse` to identity enums and route guards.

### EPIC 20 — Emergency Ward Capacity Expansion
- New migrations: `056_seed_emergency_ward.sql`, `061_extend_cath_lab_procedures.sql`
- Ensures the default dev/test environment provides 30 ER beds, 6 Triage beds, and 16 OT rooms.
- Deployment action: run `npm run db:migrate` then `npm run db:seed` in staging.

---

## US-22.1 Operational Notes
- New migrations: `047_enforce_symptom_40_char_limit.sql`, `1774000000000_enforce_symptom_40_char_limit_after_triage.sql`
- Triage complaint field (`beds.key_symptom`) is now strictly limited to 40 characters.
- Deployment action: run `npm run db:migrate` before application startup after pulling this release.

## US-22.2 Operational Notes (Doctor Evaluation & Diagnosis)
- New migration: `049_create_diagnosis_table.sql`
- Role: `doctor` role enabled for clinical documentation.
- Feature: Doctors can now record clinical diagnoses linked to patient UHID and Bed ID.
- Deployment action: run `npm run db:migrate` and assign the `doctor` role via the admin dashboard.

---

## EPIC 25 — Enhanced Dashboard Metrics (Department Metrics)
- New migration: `1773838271566_create-department-metrics-tables.js`
- Creates three new tables: `er_intake`, `ot_procedures`, `cath_lab_procedures`
- Server action: `src/features/bed-dashboard/actions/department-metrics.ts`
- Deployment steps:
  1. Run `npm run db:migrate` to create the three tables.
  2. Optionally seed sample data: `node scripts/seed-metrics.js`
  3. Confirm tables: `npm run validate:schema`

---

## DB5-02 — Persist Dashboard and Filter Preferences
- New migration: `1743241500000_create_user_settings.sql`
- Added table: `user_settings` (`user_id`, `preferences JSONB`, `updated_at`)
- Deployment action: run `npm run db:migrate` before serving traffic.
- Validation: `npm run validate:db && npm run validate:migrations && npm run validate:schema`

---

## US-21.1 Operational Notes
- New migration: `046_add_patient_demographics_to_beds.sql`
- Added bed demographics columns: `patient_ipd_id`, `patient_age`, `patient_gender`
- Deployment action: run `npm run db:migrate` before serving traffic.

---

## US-16 — Offline Queue + Replay
- New migrations:
  - `1775301000000_create_offline_queue.sql`
  - `1775302000000_add_client_operation_id_to_offline_queue.sql`
- New table: `offline_queue` — durable storage for write operations captured while offline.
- New API surfaces: `POST /api/offline-queue`, `POST /api/offline-sync/execute`
- Deployment / upgrade actions:
  1. Run `npm run db:migrate` before serving traffic.
  2. Verify: `npm run validate:migrations`
  3. Check API health: `GET /api/health`

---

## Archival and Runtime Guardrail Notes
- `src/app/api/cron/archival/route.ts` requires `Authorization: Bearer <CRON_SECRET>`.
- `src/shared/config/realtime.ts` includes updated polling guardrails.
- `src/middleware.ts` governs role and route protections; validate after deployment.

---

## US-13.11 — Cross-Browser Compatibility
- Browser support: latest 2 versions of Chrome, Firefox, Safari, and Edge.
- Unsupported browsers receive a persistent warning banner.
- CI workflow: `.github/workflows/browser-compatibility.yml`
