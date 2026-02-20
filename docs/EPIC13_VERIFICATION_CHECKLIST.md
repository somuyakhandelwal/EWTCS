# EPIC 13 Verification Checklist (Manual + Staging + Handoff)

Use this checklist to complete remaining Definition-of-Done steps for autosave reliability.

---

## 1) Manual Verification (Local)

### Preconditions
- App running locally (`npm run dev`)
- Test user with access to dashboard and admin stages
- Browser DevTools available (Network tab)

### A. Stage update autosave (dashboard)
- Open dashboard and change a bed stage.
- Confirm stage change persists immediately after page refresh.
- Simulate transient failure (Network offline/slow):
  - Confirm retry attempts occur.
  - Confirm alert appears only after retries are exhausted.
- Simulate non-transient failure (invalid transition):
  - Confirm no repeated retries.
  - Confirm inline error appears.

### B. Configuration autosave (global threshold)
- Open admin stages page.
- Change global threshold hours/minutes.
- Confirm save occurs automatically without clicking a button.
- Confirm short success message appears and clears.
- Force transient failure:
  - Confirm retries occur.
  - Confirm alert appears only after retry exhaustion.
- Force non-transient validation failure:
  - Confirm no repeated retries.
  - Confirm validation error shown.

### C. Stage metadata autosave (stage edit modal)
- Open an existing stage in edit mode.
- Confirm no manual `Save Stage` button is shown in edit mode.
- Edit name/description/color and wait debounce interval.
- Confirm changes persist after modal close + reopen.
- Repeat transient and non-transient failure checks from above.

---

## 2) Staging Verification

> If staging environment is not configured, mark as **Blocked: staging unavailable** and attach local verification evidence.

### Execute the same scenarios from Section 1 on staging
- Stage update autosave + retry/alert behavior
- Global threshold autosave + retry/alert behavior
- Stage edit autosave + retry/alert behavior

### Capture evidence
- Timestamped screenshots or short clips per scenario
- Request/response snapshots from Network tab for one success and one failed-retry flow
- Link to PR + environment URL

---

## 3) Release Handoff Checklist

- [ ] Acceptance criteria verified manually (local)
- [ ] Acceptance criteria verified on staging (or blocked reason documented)
- [ ] Automated tests passing in CI
- [ ] No file exceeds 200 lines (project rule)
- [ ] Docs updated:
  - [ ] `docs/AUTOSAVE_RELIABILITY_EPIC13.md`
  - [ ] `docs/EPIC13_VERIFICATION_CHECKLIST.md`
- [ ] PR checklist fully completed
- [ ] Reviewer notified where evidence is attached

---

## 4) Current Automated Evidence

- Reliability + autosave tests are present for:
  - `execute-stage-update` flow
  - Global threshold autosave flow
  - Stage edit autosave flow
  - Shared retry utility behavior
- Latest local run status at implementation time: all tests passing.
