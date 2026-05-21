# EWTCS — Database Schema: Tables 1–10

> **Navigation:**
> [← Index](DATABASE.md) | Tables 1–10 | [Tables 11–21 →](DATABASE_TABLES_11_21.md) | [Tables 22–25 + Relationships →](DATABASE_TABLES_22_25.md) | [ER Diagram →](DATABASE_ER_DIAGRAM.md)

---

## 1. `users`

Primary user accounts for all hospital staff.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Primary key |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | Login username |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hashed password |
| `role` | user_role ENUM | NOT NULL, DEFAULT 'nurse' | Values: `nurse`, `supervisor`, `admin`, `housekeeping`, `auditor`, `doctor`, `cardiologist`, `cath_lab_nurse` |
| `ward_id` | UUID | FK → wards(id) | Ward assignment for access control |
| `is_active` | BOOLEAN | DEFAULT TRUE | Account active status |
| `failed_login_attempts` | INT | DEFAULT 0 | Brute-force lockout counter |
| `lockout_until` | TIMESTAMPTZ | NULL | Lockout expiry timestamp |
| `must_change_password` | BOOLEAN | NOT NULL, DEFAULT FALSE | Force password change on next login |
| `temp_password_set_at` | TIMESTAMPTZ | NULL | When admin-issued temp password was set (24h expiry) |
| `email_encrypted` | TEXT | NULL | AES-256-CBC encrypted email |
| `full_name_encrypted` | TEXT | NULL | AES-256-CBC encrypted full name |
| `created_at` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |

**Indexes:** `idx_users_username`, `idx_users_is_active`, `idx_users_ward_id`, `idx_users_must_change_password`

---

## 2. `wards`

Hospital ward zones for bed and user grouping.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | Ward name (e.g., "Emergency Ward A") |
| `code` | VARCHAR(20) | UNIQUE, NOT NULL | Short code (e.g., "EWA") |
| `description` | TEXT | | Ward description |
| `is_active` | BOOLEAN | DEFAULT true | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**Default Data:** Emergency Ward A (EWA), Emergency Ward B (EWB), Emergency Ward C (EWC)

---

## 3. `stages`

Patient workflow stages in the emergency ward.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | Stage name |
| `display_order` | INTEGER | UNIQUE, NOT NULL | Ordering for UI display |
| `color_code` | VARCHAR(20) | NOT NULL | UI color identifier |
| `description` | TEXT | | Human-readable description |
| `is_active` | BOOLEAN | DEFAULT true | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**Default 8-Stage Workflow:**

| Order | Name | Color | Description |
|-------|------|-------|-------------|
| 0 | Empty | gray | Bed is available |
| 1 | Initial Investigation | blue | Doctor performing initial assessment and ordering investigations |
| 2 | Initial Treatment | cyan | Patient receiving first-line treatment |
| 3 | Drugs/Test | yellow | Awaiting medications or diagnostic test results |
| 4 | Observation | orange | Patient under active clinical monitoring |
| 5 | Decision Made | green | Discharge or admission decision has been made |
| 6 | Discharge Process | purple | Patient being discharged or transferred to another ward |
| 7 | Cleaning | pink | Bed cleaning and preparation |

---

## 4. `beds`

Emergency ward beds with current status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `bed_number` | VARCHAR(50) | UNIQUE, NOT NULL | Bed identifier (e.g., "ER-01") |
| `current_stage_id` | UUID | FK → stages(id) | Current workflow stage |
| `ward_id` | UUID | FK → wards(id) | Ward assignment |
| `ward_name` | VARCHAR(100) | | Denormalized ward name |
| `patient_start_time` | TIMESTAMPTZ | | When current patient was admitted |
| `last_stage_change` | TIMESTAMPTZ | | Last stage transition timestamp |
| `is_occupied` | BOOLEAN | DEFAULT false | Bed occupancy |
| `is_active` | BOOLEAN | DEFAULT true | Bed active in system |
| `is_temporary` | BOOLEAN | DEFAULT false | Temporary/overflow bed flag |
| `is_virtual` | BOOLEAN | DEFAULT false | Virtual bed (no physical bed) |
| `metadata` | JSONB | DEFAULT '{}' | Flexible extra data |
| `patient_name_encrypted` | TEXT | | AES encrypted patient name |
| `patient_contact_encrypted` | TEXT | | AES encrypted contact info |
| `patient_mrd_encrypted` | TEXT | | AES encrypted medical record ID |
| `symptom` | VARCHAR(40) | | Patient presenting symptom (max 40 chars) |
| `triage_category` | VARCHAR(20) | | Triage priority category |
| `patient_ipd_id` | VARCHAR(100) | | Optional IPD identifier |
| `patient_age` | INTEGER | CHECK (1-130) | Patient age in years |
| `patient_gender` | VARCHAR(20) | CHECK (Male/Female/Other/Unknown) | Patient gender |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**Indexes:** `idx_beds_bed_number`, `idx_beds_occupied`, `idx_beds_stage`, `idx_beds_active`, `idx_beds_ward_id`

---

## 5. `bed_stage_logs`

Immutable historical log of every bed stage transition.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `bed_id` | UUID | FK → beds(id) ON DELETE CASCADE, NOT NULL | Bed reference |
| `from_stage_id` | UUID | FK → stages(id) | Previous stage (NULL for first assignment) |
| `to_stage_id` | UUID | FK → stages(id), NOT NULL | New stage |
| `changed_by_user_id` | UUID | FK → users(id), NOT NULL | Who made the change |
| `shift_id` | UUID | FK → shifts(id) | Shift during which change occurred |
| `transition_time` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | When transition happened |
| `duration_in_previous_stage_ms` | BIGINT | | Time in previous stage (ms) |
| `notes` | TEXT | | Transition notes |
| `notes_encrypted` | TEXT | | AES encrypted notes |
| `metadata` | JSONB | DEFAULT '{}' | Extra context (delay reasons, etc.) |

**Indexes:** `idx_bed_logs_bed_id`, `idx_bed_logs_transition_time`, `idx_bed_logs_user`, `idx_bed_stage_logs_bed_to_stage`

⚠️ **Immutability enforced** via database triggers — direct UPDATE/DELETE is blocked on this table.

---

## 6. `stage_transitions`

Defines valid workflow transitions between stages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `from_stage_id` | UUID | FK → stages(id), UNIQUE(from,to) | Source stage (NULL = any) |
| `to_stage_id` | UUID | FK → stages(id), NOT NULL | Target stage |
| `is_allowed` | BOOLEAN | NOT NULL, DEFAULT true | Whether transition is permitted |
| `requires_supervisor_override` | BOOLEAN | NOT NULL, DEFAULT false | Needs supervisor approval |
| `reason` | TEXT | | Why this rule exists |
| `description` | VARCHAR(255) | | Human-readable description |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `priority` | INTEGER | NOT NULL, DEFAULT 0 | Rule priority (higher = overrides) |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**Seeded Rules (U.S 25.2):**
- **Forward (allowed):** Empty → Initial Investigation → Initial Treatment → Drugs/Test → Observation → Decision Made → Discharge Process → Cleaning → Empty
- **Backward (supervisor override):** Observation → Initial Treatment, Drugs/Test → Initial Investigation, Initial Treatment → Initial Investigation
- **Skip (supervisor override):** Initial Investigation → Decision Made, Empty → Observation, Empty → Initial Treatment

---

## 6A. `triage_bed_statuses`

Current triage-specific state for each physical triage bed.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `bed_id` | UUID | PK, FK â†’ beds(id) ON DELETE CASCADE | Triage bed reference |
| `state` | triage_bed_state ENUM | NOT NULL, DEFAULT empty | `empty`, `initial_treatment`, `decision_made`, or `cleaning` |
| `last_state_change` | TIMESTAMPTZ | NOT NULL | Last triage state transition time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last row update time |
| `metadata` | JSONB | NOT NULL, DEFAULT '{}' | Triage workflow metadata |

**Indexes:** `idx_triage_statuses_state`

---

## 6B. `triage_state_logs`

Immutable historical log of triage bed state transitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `bed_id` | UUID | FK â†’ beds(id) ON DELETE CASCADE, NOT NULL | Triage bed reference |
| `from_state` | triage_bed_state ENUM | | Previous triage state |
| `to_state` | triage_bed_state ENUM | NOT NULL | New triage state |
| `changed_by_user_id` | UUID | FK â†’ users(id), NOT NULL | Who made the change |
| `transition_time` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When transition happened |
| `duration_in_previous_state_ms` | BIGINT | | Time in previous triage state |
| `notes` | TEXT | | Transition notes |
| `metadata` | JSONB | NOT NULL, DEFAULT '{}' | Extra workflow context |

**Indexes:** `idx_triage_logs_bed_id`, `idx_triage_logs_transition_time`, `idx_triage_logs_user`

---

## 7. `audit_logs`

Generic audit trail for all entity changes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `action_type` | VARCHAR(50) | NOT NULL | Action: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc. |
| `entity_type` | VARCHAR(50) | NOT NULL | Entity: user, bed, patient, etc. |
| `entity_id` | UUID | NOT NULL | ID of the affected entity |
| `performed_by_user_id` | UUID | FK → users(id), NOT NULL | Who performed the action |
| `target_user_id` | UUID | FK → users(id) | Legacy: specific user target |
| `changes` | JSONB | | What changed (old → new values) |
| `reason` | TEXT | | Reason for the action |
| `metadata` | JSONB | DEFAULT '{}' | Feature-specific extra data |
| `ip_address` | INET | | Client IP address |
| `details_encrypted` | TEXT | | AES encrypted audit details |
| `created_at` | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |

**Indexes:** `idx_audit_logs_entity`, `idx_audit_logs_entity_type`, `idx_audit_logs_action_type`

⚠️ **Immutability enforced** — UPDATE/DELETE blocked via database trigger.

---

## 8. `token_blacklist`

Blacklisted JWT tokens (invalidated on logout).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `token` | TEXT | PK | The JWT token string |
| `expires_at` | TIMESTAMPTZ | NOT NULL | When the token would have expired |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

---

## 9. `patient_admissions`

Immutable archive of completed patient stays.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `bed_id` | UUID | FK → beds(id) ON DELETE CASCADE, NOT NULL | Bed the patient occupied |
| `admitted_at` | TIMESTAMPTZ | NOT NULL | Snapshot of patient_start_time at discharge |
| `discharged_at` | TIMESTAMPTZ | NOT NULL | When discharge was confirmed |
| `total_duration_ms` | BIGINT | NOT NULL | Total stay duration in milliseconds |
| `discharged_by_user_id` | UUID | FK → users(id), NOT NULL | Nurse who actioned discharge |
| `notes` | TEXT | | Discharge notes |
| `tat_from_previous_discharge_ms` | BIGINT | | Turnaround time from previous patient |
| `created_at` | TIMESTAMPTZ | | |

---

## 10. `kiosk_sessions`

Active kiosk sessions bound to specific IP addresses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `user_id` | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL | User account |
| `bound_ip` | VARCHAR(45) | NOT NULL | IP address the session is locked to |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | | |
| `disabled_at` | TIMESTAMPTZ | | When session was revoked |
| `disabled_by` | UUID | FK → users(id) | Admin who revoked it |

---

> **Navigation:**
> [← Index](DATABASE.md) | Tables 1–10 | [Tables 11–21 →](DATABASE_TABLES_11_21.md) | [Tables 22–25 + Relationships →](DATABASE_TABLES_22_25.md) | [ER Diagram →](DATABASE_ER_DIAGRAM.md)
