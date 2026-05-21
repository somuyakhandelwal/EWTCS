# Dedicated Triage Workflow

EPIC 25 models triage as a separate physical area with six beds:
`TRIAGE-01` through `TRIAGE-06`.

Triage bed state is not stored in the ER `stages` workflow. The approved
triage states are:

- `empty`
- `initial_treatment`
- `decision_made`
- `cleaning`

Allowed transitions:

- `empty -> initial_treatment` when a patient is assigned.
- `initial_treatment -> decision_made` after assessment and treatment.
- `decision_made -> cleaning` after the triage decision is completed.
- `cleaning -> empty` after cleaning is complete.

## Decision Outcomes (After Decision Made)

Once a triage bed reaches `decision_made`, staff must record an outcome:

- **Shift to ER** — requires selection of an available ER bed. The patient is
  assigned to the selected ER bed and that bed starts the ER workflow at the
  configured ER starting stage (default: Initial Investigation). The triage bed moves to
  `cleaning`.
- **Shift to ICU/OT** — records the disposition and moves the triage bed to
  `cleaning`.
- **Discharge** — records the disposition and moves the triage bed to
  `cleaning`.

All decision outcomes are recorded in triage state logs and audit logs.

ER-only stages such as `initial investigation`, `drugs/test`, `observation`,
and `discharge process` must not appear in triage.

## Database Notes

- `triage_bed_statuses` stores the current triage state per triage bed.
- `triage_state_logs` stores immutable triage state history.
- Patient snapshot fields remain on `beds` for this story.
- `triage_decisions` stores each recorded disposition with patient snapshot
  fields and optional ER transfer details. It does not create a separate
  patient journey ID.
- Every triage state mutation also writes an `audit_logs` row with
  `entity_type = 'triage_bed'`.
