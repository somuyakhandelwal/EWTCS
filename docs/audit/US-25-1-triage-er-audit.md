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

Both ER and triage beds currently consume the **same global stages table and dashboard transition logic**, which is architecturally incorrect.

There is **no separate `src/features/triage/` module**. The `/triage` route exists at `src/app/triage/page.tsx` but it reuses `BedDashboardContainer` from `bed-dashboard` — meaning triage has no independent feature module of its own.

---

## 2. Current ER Stage Workflow (Incorrect Model)

Defined in `migrations/005_create_beds_and_stages.sql`.  
Actual DB stage order:

| Order | Stage Name | Color | Problem |
|-------|-----------|-------|---------|
| 0 | **Empty** | Gray | ✅ Valid ER stage |
| 1 | **Triage** | Blue | ❌ Should NOT be an ER stage |
| 2 | Registration | Cyan | ✅ ER stage |
| 3 | Doctor Assessment | Yellow | ✅ ER stage |
| 4 | Treatment/Observation | Orange | ✅ ER stage |
| 5 | Decision Made | Green | ✅ ER stage |
| 6 | Discharge Process | Purple | ✅ ER stage |
| 7 | Cleaning | Pink | ✅ ER stage |

Flow: `Empty → Triage → Registration → Doctor Assessment → Treatment/Observation → Decision Made → Discharge Process → Cleaning → Empty`

**Root Cause:** Triage was added as stage 1 in ER workflow. It should be a completely separate area with its own workflow.

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
- **Page:** `src/app/triage/page.tsx` — `/triage` route exists
- **BUT** it reuses `BedDashboardContainer` with `areaView="triage"` — same ER component
- **No separate `src/features/triage/` module exists**
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
| `src/features/bed-dashboard/actions/department-metrics.ts` | ⚠️ Calculates triage time using the **Triage stage name**, not physical triage beds — will break when Triage is removed as an ER stage |
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
| `scripts/seed-config.mjs` | Seeds ER history and live data with Triage as part of patient journeys — important for audit as it shows how triage is embedded in ER patient flow |

---

## 5. Current TAT Calculation — Triage Impact

TAT (Turnaround Time) is tracked at multiple levels, not only from `patient_start_time`:

| TAT Type | How Calculated | Where |
|----------|---------------|-------|
| **Cleaning → Empty TAT** | Time from Cleaning stage entry to bed reset | `discharge-queries.ts` |
| **Discharge Process → Empty TAT** | Time from Discharge stage to bed becoming Empty | `discharge-queries.ts` |
| **Full-cycle TAT** | Time from previous discharge → next admission | `patient_admissions` table, `discharge-queries.ts` |
| **Triage time (stage-based)** | Uses Triage **stage name** in `department-metrics.ts` | `department-metrics.ts` |

**Critical Risk:** `department-metrics.ts` calculates triage metrics by looking for the `Triage` stage name in the ER stages table. When Triage is removed as an ER stage in later stories, this calculation will silently break or return wrong results unless updated.

---

## 6. What Must Change in Later Stories

### US-25.2 — Standardize ER Workflow
- Update the fresh-install seed/migration path to remove Triage from ER stages
- Add a safe repair migration for existing databases that already have Triage as an ER stage
- Update `migrations/010`, `037`, `054` — remove Triage stage transitions from ER flow
- Update `src/features/bed-dashboard/lib/bed-mutations.constants.ts` — stage logic

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
- Fix `department-metrics.ts` — replace Triage stage name lookup with physical triage bed/ward query
- Update analytics and reporting

---

## 7. Files That Must NOT Be Changed Until US-25.2+

These files are currently working and should only be touched in later stories:

- `migrations/005_create_beds_and_stages.sql` — do not change until repair migration is ready
- `src/features/bed-dashboard/actions/triage-actions.ts` — still used by triage page
- `src/app/triage/page.tsx` — still functional, do not break
- `src/features/bed-dashboard/actions/department-metrics.ts` — still works but will need update in US-25.5
- All `bed_stage_logs` and `patient_admissions` data — no data migration yet

---

## 8. No Production Changes Made

This story is investigation only. Zero production behavior was changed.  
No production changes were made. Build/test verification not required unless this doc is committed.