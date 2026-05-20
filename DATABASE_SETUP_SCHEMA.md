# Database Setup — Schema Reference

> **Navigation:** [Index](DATABASE_SETUP.md) | [Quick Start](DATABASE_SETUP_QUICKSTART.md) | Schema | [Settings & Indexes](DATABASE_SETUP_SETTINGS_INDEXES.md) | [Ward Access](DATABASE_SETUP_WARD_ACCESS.md) | [Troubleshooting](DATABASE_SETUP_TROUBLESHOOTING.md) | [Migrations & Testing](DATABASE_SETUP_MIGRATIONS.md)

---

## Database Schema

### Tables Overview

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | Authentication & user management | id, username, role, password_hash, ward_id |
| `audit_logs` | Security & compliance logging | id, action_type, performed_by, timestamp |
| `stages` | Patient workflow stages | id, name, display_order, color_code |
| `beds` | Emergency ward beds | id, bed_number, current_stage_id, is_occupied, ward_id, patient_uhid, patient_name, key_symptom, triage_category |
| `bed_stage_logs` | Bed transition history | id, bed_id, from_stage_id, to_stage_id, transition_time |
| `stage_transitions` | Workflow rules for stage updates | from_stage_id, to_stage_id, is_allowed, requires_supervisor_override |
| `wards` | Hospital ward definitions | id, name, code, description, is_active |
| `patient_admissions` | Completed patient stays (source of truth for analytics) | id, bed_id, admitted_at, discharged_at, duration_ms |
| `shifts` | Shift definitions for filtering | id, name, start_time, end_time |
| `system_settings` | Global configurable thresholds (key-value store) | key, value, updated_at |
| `stage_delay_thresholds` | Per-stage delay threshold overrides | stage_id, threshold_minutes |
| `disposition_delay_reasons` | Open delay reason log per bed | id, bed_id, reason, recorded_at, resolved_at |
| `token_blacklist` | Invalidated JWT tokens | token_hash, expires_at |
| `kiosk_sessions` | Kiosk mode session tracking | id, ward_id, created_at, expires_at |
| `er_intake` | Emergency intake tracking | id, bed_id, occupancy_status, triage_time_minutes |
| `ot_procedures` | Operation theater procedures | id, patient_name, status, room_id |
| `cath_lab_procedures` | Cath lab procedures | id, procedure_type, status |
| `offline_queue` | Persisted offline write queue for network outage recovery | id, operation, payload, status, retry_count, client_operation_id, created_at |
| `user_settings` | Per-user UI preferences persisted across sessions/devices (DB5-02) | user_id, preferences (JSONB), updated_at |
| `diagnosis` | Clinical diagnosis records (US-22.2) | id, bed_id, doctor_id, patient_uhid, diagnosis_text, diagnosed_at |

---

### US-16 Offline Queue Persistence

Migrations `1775301000000_create_offline_queue.sql` and `1775302000000_add_client_operation_id_to_offline_queue.sql` add durable offline synchronization support:

- Creates `offline_queue` for queued write operations created while offline.
- Adds `client_operation_id` for idempotent replay and safer retry behavior.
- Supports reconnect drain workflows so queued clinical actions are applied after connectivity returns.

---

### US-21.1 Triage Demographics (beds table)

Migration `046_add_patient_demographics_to_beds.sql` adds active triage demographic columns to `beds`:

- `patient_uhid` (varchar)
- `patient_ipd_id` (varchar, optional)
- `patient_name` (varchar)
- `patient_age` (integer, constrained to 1-130)
- `patient_gender` (varchar, constrained to Male/Female/Other/Unknown)
- `key_symptom` (text)
- `triage_category` (varchar)

These values represent the active patient currently occupying a bed and are reset during discharge/non-patient transitions.

---

### DB5-02 User Settings Persistence

Migration `1743241500000_create_user_settings.sql` adds the `user_settings` table to persist dashboard UI preferences in PostgreSQL.

- `user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`
- `preferences JSONB NOT NULL DEFAULT '{}'`
- `updated_at TIMESTAMPTZ`

The `preferences` JSONB field stores user-specific keys such as:

- `confirmCriticalStages`
- `showDelayedOnly`
- `sortOrder`
- `helpPanelOpen`

This replaces browser-only persistence and ensures settings load consistently across sessions and devices.

---

### US-22.1 Symptoms / Complaint Limit

Migrations `047_enforce_symptom_40_char_limit.sql` and `1774000000000_enforce_symptom_40_char_limit_after_triage.sql` enforce strict complaint length rules for triage intake across upgrade and clean-install paths:

- `beds.key_symptom` is enforced as `VARCHAR(40)`
- Constraint `chk_beds_key_symptom_max_40` ensures length never exceeds 40 chars

UI and server validation also enforce this same 40-character limit to keep behavior consistent end-to-end.

---

### Default Stages (EPIC 25 Standardized ER Stages)

Emergency Ward (ER) beds use the 8 approved stages:

| Stage | Order | Color | Description |
|-------|-------|-------|-------------|
| Empty | 0 | Gray | Bed is available and ready for next patient |
| Initial Investigation | 1 | Blue | Doctor performing initial assessment and ordering investigations |
| Initial Treatment | 2 | Cyan | Patient receiving first-line treatment |
| Drugs/Test | 3 | Yellow | Awaiting medications or diagnostic test results |
| Observation | 4 | Orange | Patient under active clinical monitoring |
| Decision Made | 5 | Green | Discharge or admission decision has been made |
| Discharge Process | 6 | Purple | Patient being discharged or transferred to another ward |
| Cleaning | 7 | Pink | Bed being cleaned and prepared for the next patient |

> [!NOTE]
> **Legacy Stages Deactivated:** Under EPIC 25, the four legacy stages (`Triage`, `Registration`, `Doctor Assessment`, `Treatment/Observation`) have been deactivated (`is_active = false`) in the database. Their data is preserved for audit log and bed stage log historical integrity. Triage is now handled in a dedicated Triage Ward with 6 beds.

---

### Stage Transition Rules

Stage transition rules are stored in the `stage_transitions` table (migration 010). These rules control which stage updates are allowed, which require supervisor approval, and which are blocked.

Key fields:
- `from_stage_id`: Source stage (NULL means any current stage)
- `to_stage_id`: Destination stage
- `is_allowed`: Whether the transition is allowed without override
- `requires_supervisor_override`: If true, only supervisors/admins can approve
- `priority`: Higher priority rules override lower ones

Default rules are seeded by migration 010 and reflect the standard emergency workflow with safe override options for edge cases.

---

### Relationships

```
users (1) ──< (many) audit_logs
users (1) ──< (many) bed_stage_logs
stages (1) ──< (many) beds
stages (1) ──< (many) bed_stage_logs
beds (1) ──< (many) bed_stage_logs
wards (1) ──< (many) users
wards (1) ──< (many) beds
```

---

### Triage Columns on `beds` (Migration `1773770454739_add-triage-columns-to-beds`)

Active triage data for the patient currently occupying a bed is stored as dedicated typed columns on the `beds` table:

| Column | Type | Description |
|---|---|---|
| `patient_uhid` | `varchar(100)` | Unique Hospital ID of the active patient |
| `patient_name` | `varchar(255)` | Full name of the active patient |
| `key_symptom` | `text` | Presenting complaint / key symptom |
| `triage_category` | `varchar(50)` | Triage priority category (e.g. Red, Yellow, Green) |

These values are reset to `NULL` when a patient is discharged or the bed transitions to a non-patient stage.

---

> **Next:** See [System Settings & Performance Indexes](DATABASE_SETUP_SETTINGS_INDEXES.md) for configurable thresholds and query optimization.
