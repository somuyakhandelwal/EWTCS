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

ER-only stages such as `initial investigation`, `drugs/test`, `observation`,
and `discharge process` must not appear in triage.

## Database Notes

- `triage_bed_statuses` stores the current triage state per triage bed.
- `triage_state_logs` stores immutable triage state history.
- Patient snapshot fields remain on `beds` for this story.
- Every triage state mutation also writes an `audit_logs` row with
  `entity_type = 'triage_bed'`.
