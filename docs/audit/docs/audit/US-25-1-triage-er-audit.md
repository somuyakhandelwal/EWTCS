# US-25.1 — Audit: Triage and Emergency Ward Workflow
**Epic:** EPIC 25 — Separate Triage Area from Emergency Ward  
**Date:** May 2026  
**Status:** Audit Complete  

---

## 1. Problem Summary

The current system incorrectly treats **Triage as a stage inside the ER bed workflow**.  
In reality:
- **Triage Area** = separate physical area with **6 beds** (TRIAGE-01 to TRIAGE-06)
- **Emergency Ward** = separate area with **30 beds** (ER-01 to ER-30)

Both share the same `beds` table and the same 8-stage workflow, which is wrong.

---

## 2. Current ER Stage Workflow (Incorrect Model)

Defined in `migrations/005_create_beds_and_stages.sql`:

| Order | Stage Name | Color | Problem |
|-------|-----------|-------|---------|
| 1 | **Triage** | Blue | ❌ Should NOT be an ER stage |
| 2 | Registration | Cyan | ✅ ER stage |
| 3 | Doctor Assessment | Yellow | ✅ ER stage |
| 4 | Treatment/Observation | Orange | ✅ ER stage |
| 5 | Decision Made | Green | ✅ ER stage |
| 6 | Discharge Process | Purple | ✅ ER stage |
| 7 | Cleaning | Pink | ✅ ER stage |
| 8 | Empty | Gray | ✅ ER stage |

**Root Cause:** Triage was added as stage 1 in ER workflow. It should be a completely separate area.

---

## 3. Triage Area — Current Implementation

### Database
- **Ward:** `wards` table — `code = 'TRIAGE'`, `name = 'Triage Area'`
- **Beds:** 6 beds seeded — `TRIAGE-01` to `TRIAGE-06`
- **Migration:** `migrations/1773855000000_seed_triage_area_beds.sql`
- **Triage columns on `beds` table** (migration `1773770454739_add-triage-columns-to-beds.js`):
  - `patient_uhid`, `patient_ipd_id`, `patient_name`, `patient_age`
  - `patient_gender`, `key_symptom`, `triage_category`

### UI
- **Page:** `src/app/triage/page.tsx` — `/triage` route exists ✅
- **BUT** it reuses `BedDashboardContainer` with `areaView="triage"` — same ER component
- **Filtering:** `bed-grid-actions.ts` filters beds by ward ID to show triage beds separately

---

## 4. Files Where Triage Is Incorrectly Mixed With ER

### Migrations
| File | Problem |
|------|---------|
| `migrations/005_create_beds_and_stages.sql` | Triage seeded as ER stage (line 62) |
| `migrations/010_create_stage_transitions.sql` | Triage stage transitions defined for ER flow |
| `migrations/037_fix_stage_transitions.sql` | Triage in ER transition rules |
| `migrations/054_repair_stage_transitions_table.sql` | Triage still in ER transitions |

### Source Code
| File | Problem |
|------|---------|
| `src/app/triage/page.tsx` | Uses ER `BedDashboardContainer` — no separate triage logic |
| `src/features/bed-dashboard/actions/bed-grid-actions.ts` | Filters triage by ward ID — fragile |
| `src/features/bed-dashboard/actions/triage-actions.ts` | Updates triage info on `beds` table — mixed with ER |
| `src/features/bed-dashboard/lib/bed-sql-constants.ts` | `TRIAGE_INFO_METADATA_PROJECTION` baked into ER query |
| `src/features/bed-dashboard/lib/discharge-queries.ts` | Discharge logic clears triage fields — mixed |
| `src/features/bed-dashboard/components/TriageModal.tsx` | Triage modal inside ER bed dashboard |
| `src/features/bed-dashboard/components/BedCard.tsx` | Shows triage info on ER bed cards |
| `src/features/bed-dashboard/types/bed.ts` | `triageInfo` nested in ER `Bed` type (line 54) |

### Scripts
| File | Problem |
|------|---------|
| `scripts/seed-metrics.js` | Seeds `er_intake` with `triage_level` field — mixed |
| `scripts/seed-genuine-data.mjs` | References triage in ER context |

---

## 5. Current TAT Calculation — Triage Impact

- TAT currently measured from `patient_start_time` on `beds` table
- This captures time from **first ER stage entry**, NOT from triage arrival
- `patient_admissions` table stores discharge records — no triage entry time
- **Problem:** No separate TAT for triage → ER transfer exists

Files affected:
- `src/features/bed-dashboard/lib/discharge-queries.ts`
- `src/features/bed-dashboard/actions/department-metrics.ts`

---

## 6. What Must Change in Later Stories

### US-25.2 — Remove Triage as ER Stage
- `migrations/005_create_beds_and_stages.sql` — remove Triage stage
- `migrations/010`, `037`, `054` — remove Triage stage transitions
- `src/features/bed-dashboard/lib/bed-mutations.constants.ts` — update stage logic

### US-25.3 — Repair Triage as Separate 6-Bed Workflow
- Create `src/features/triage/` feature module (separate from `bed-dashboard`)
- New triage-specific types, actions, components
- `src/app/triage/page.tsx` — use triage feature, not ER dashboard

### US-25.4 — Triage Decision Outcomes + Transfer to ER
- New migration for `triage_decisions` table
- Transfer logic from TRIAGE-XX bed → ER-XX bed
- New server actions for transfer

### US-25.5 — TAT Tracking
- New `triage_admissions` table to track triage entry/exit time
- Separate TAT calculation for triage vs ER
- Update analytics and reporting

---

## 7. Files That Must NOT Be Changed Until US-25.2+

These files are currently working and should only be touched in later stories:

- `migrations/005_create_beds_and_stages.sql` — do not remove Triage stage yet
- `src/features/bed-dashboard/actions/triage-actions.ts` — still used by triage page
- `src/app/triage/page.tsx` — still functional, do not break
- All `bed_stage_logs` and `patient_admissions` data — no data migration yet

---

## 8. No Production Changes Made

This story is investigation only. Zero production behavior was changed.  
Build passes, all tests pass (87 files, 782 tests).