# [US-21.1] UHID and IPD Integration for Bed Triage (Issue #258)

## Summary

This PR implements US-21.1 by extending triage intake and bed display with required patient demographics for HIS integration.

It also includes runtime chunk-load stabilization improvements identified during validation.

## Problem Statement

Triage intake needed to capture and persist:

- UHID (required)
- IPD ID (optional)
- Patient Name (required)
- Age (required)
- Gender (required)

And the dashboard needed to display these details consistently while preventing stale identity carryover after discharge/stage reset.

## Scope of Changes

### 1. Triage Intake and Types

- Added patientIpdId, patientAge, and patientGender to triage payload contracts.
- Updated modal form inputs, prefill/reset logic, and client-side guards.

Files:

- src/features/bed-dashboard/components/TriageModal.tsx
- src/features/bed-dashboard/components/TriageModalFormFields.tsx
- src/features/bed-dashboard/components/triage-modal.types.ts
- src/features/bed-dashboard/components/BedDashboardModals.tsx
- src/features/bed-dashboard/hooks/useTriageConfirm.ts
- src/features/bed-dashboard/hooks/useBedStageUpdate.ts
- src/features/bed-dashboard/types/bed.ts

### 2. Server Persistence and Validation

- Added normalization and validation for UHID, Name, Age, and optional IPD.
- Persisted active triage demographics into centralized bed columns.
- Kept metadata.triageInfo synchronized for compatibility.

File:

- src/features/bed-dashboard/actions/triage-actions.ts

### 3. Read Path and UI Display

- Synthesized metadata.triageInfo from centralized columns in bed query paths.
- Updated patient details rendering to include UHID, optional IPD, Age, and Gender.

Files:

- src/features/bed-dashboard/lib/bed-read-queries.ts
- src/features/bed-dashboard/lib/bed-queries.ts
- src/features/bed-dashboard/lib/bed-bottleneck-queries.ts
- src/features/bed-dashboard/components/BedTriageInfo.tsx

### 4. Reset and Cleanup Safety

- Cleared patient demographic columns when transitioning to non-patient states.
- Cleared demographics during discharge reset to prevent stale carryover.

Files:

- src/features/bed-dashboard/lib/bed-mutations.constants.ts
- src/features/bed-dashboard/lib/discharge-queries.ts

### 5. Database Migration

- Added migration 046_add_patient_demographics_to_beds.sql for new demographics columns and constraints.
- Preserved existing historical migrations unchanged to comply with pre-merge migration policy.

Files:

- migrations/046_add_patient_demographics_to_beds.sql

### 6. Runtime Chunk Stability

- Reduced root layout chunk pressure by code-splitting non-critical client modules.
- Replaced framer-motion route wrapper in root transition with lightweight CSS animation.
- Cleans .next in dev script to avoid stale chunk mismatches.

Files:

- src/app/layout.tsx
- src/shared/components/PageTransition.tsx
- src/app/globals.css
- package.json

## Acceptance Criteria Mapping

- Capture and save UHID, IPD, Name, Age, Gender in triage: Implemented.
- Display the patient details in the bed card/detail view: Implemented.
- Missing IPD should still allow triage save: Implemented (optional/null-safe).

## Validation Evidence

Executed and passing:

- npm run validate:all
- npx vitest run
- npm run db:status (0 pending)

Observed summary:

- 85/85 test files passed
- 774/774 tests passed
- Build completed successfully
- Migration status clean with all expected migrations applied

## Risk and Mitigation

- Risk: stale client chunk references in local dev.
  - Mitigation: dev startup clears .next and root layout bundle pressure reduced.
- Risk: migration policy checks on existing files.
  - Mitigation: only a new forward migration is introduced; historical migrations remain immutable.

## Rollback Notes

- Code rollback: revert this PR.
- DB rollback: for local/manual rollback, follow comments in migrations/046_add_patient_demographics_to_beds.sql.

## Linked Issue

Closes #258
