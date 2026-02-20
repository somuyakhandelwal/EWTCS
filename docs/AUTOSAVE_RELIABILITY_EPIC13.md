# EPIC 13: Autosave Reliability Traceability

**Story:** Auto-save stage and configuration changes to prevent work loss on crash/refresh/network interruptions.

**Status:** Implemented and test-covered (February 20, 2026).

---

## Acceptance Criteria Mapping

### 1) Stage updates are saved immediately

- **Implementation**
  - `src/features/bed-dashboard/lib/execute-stage-update.ts`
    - Stage updates execute immediately on stage select.
    - Includes retry behavior for transient failures.
  - `src/features/stage-management/components/StageFormModal.tsx`
    - Edit mode autosaves stage metadata changes after short debounce.

- **Automated Tests**
  - `src/features/stage-management/components/StageFormModal.test.tsx`
    - Verifies edit mode autosaves without manual save click.

### 2) Configuration changes are saved immediately

- **Implementation**
  - `src/features/stage-management/components/GlobalThresholdForm.tsx`
    - Global threshold changes autosave after debounce.

- **Automated Tests**
  - `src/features/stage-management/components/GlobalThresholdForm.test.tsx`
    - Verifies autosave invocation and success feedback.

### 3) No manual "Save" button required

- **Implementation**
  - `src/features/stage-management/components/GlobalThresholdForm.tsx`
    - Manual save button removed.
  - `src/features/stage-management/components/StageFormModal.tsx`
    - Edit mode does not show manual save button.

- **Automated Tests**
  - `src/features/stage-management/components/StageFormModal.test.tsx`
    - Asserts `Save Stage` button is absent in edit mode.

### 4) Save confirmation is shown briefly

- **Implementation**
  - `src/features/stage-management/components/GlobalThresholdForm.tsx`
    - Shows success confirmation briefly after autosave.
  - `src/features/stage-management/components/StageFormModal.tsx`
    - Shows brief "Changes saved" status after autosave.

- **Automated Tests**
  - `src/features/stage-management/components/GlobalThresholdForm.test.tsx`
    - Verifies success confirmation appears and clears.

### 5) Failed saves trigger retry and alert

- **Implementation**
  - `src/shared/lib/retry.ts`
    - Shared retry utility with configurable retry/backoff.
  - `src/features/bed-dashboard/lib/execute-stage-update.ts`
    - Retries stage transition save; alerts on exhausted retries.
  - `src/features/stage-management/components/GlobalThresholdForm.tsx`
    - Retries autosave; alerts on exhausted retries.
  - `src/features/stage-management/components/StageFormModal.tsx`
    - Retries autosave in edit mode; alerts on exhausted retries.

- **Automated Tests**
  - `src/shared/lib/retry.test.ts`
    - Verifies retry success and retry exhaustion behavior.
  - `src/features/stage-management/components/GlobalThresholdForm.test.tsx`
    - Verifies alert shown after autosave retries fail.
  - `src/features/stage-management/components/StageFormModal.test.tsx`
    - Verifies alert shown after autosave retries fail.

---

## Verification Summary

- Test suite executed with all tests passing.
- Current totals after EPIC 13 additions:
  - **Test Files:** 25
  - **Tests:** 359

---

## Notes

- Implementation follows feature-first architecture and existing action patterns.
- File-size constraints were respected for modified and added files.
- No secrets, credentials, or sensitive data were introduced.
