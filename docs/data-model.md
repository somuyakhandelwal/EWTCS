# Data Model Documentation

This document describes the database schema and data relationships for the EWTCS project. The schema is designed for high auditability, real-time performance, and structured analytics.

## 🏗️ Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        uuid id PK
        string username
        string password_hash
        user_role role
        uuid ward_id FK
        boolean is_active
        timestamp last_login
    }

    WARDS {
        uuid id PK
        string name
    }

    BEDS {
        uuid id PK
        string bed_number
        uuid current_stage_id FK
        uuid ward_id FK
        timestamp patient_start_time
        timestamp last_stage_change
        boolean is_occupied
        boolean is_virtual
        boolean is_temporary
    }

    STAGES {
        uuid id PK
        string name
        int display_order
        string color_code
        bigint threshold_ms
    }

    BED_STAGE_LOGS {
        uuid id PK
        uuid bed_id FK
        uuid from_stage_id FK
        uuid to_stage_id FK
        uuid user_id FK
        uuid patient_admission_id FK
        timestamp transition_time
        bigint duration_ms
        jsonb metadata
    }

    PATIENT_ADMISSIONS {
        uuid id PK
        uuid bed_id FK
        uuid discharged_by_user_id FK
        timestamp admitted_at
        timestamp discharged_at
        bigint total_duration_ms
        text notes
    }

    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        string action
        string entity_type
        uuid entity_id
        jsonb metadata
        timestamp created_at
        inet ip_address
    }

    SHIFTS {
        uuid id PK
        string name
        time start_time
        time end_time
    }

    DAILY_SUMMARIES {
        uuid id PK
        date summary_date
        text content
        jsonb ai_insights
        string status
    }

    USERS ||--o{ BED_STAGE_LOGS : "logs change"
    USERS ||--o{ PATIENT_ADMISSIONS : "discharges"
    USERS ||--o{ AUDIT_LOGS : "performs action"
    WARDS ||--o{ USERS : "belongs to"
    WARDS ||--o{ BEDS : "contains"
    BEDS ||--o{ BED_STAGE_LOGS : "has historical stages"
    BEDS ||--o{ PATIENT_ADMISSIONS : "has historical stays"
    STAGES ||--o{ BEDS : "current state"
    STAGES ||--o{ BED_STAGE_LOGS : "transition point"
    BED_STAGE_LOGS ||--o| PATIENT_ADMISSIONS : "part of stay"
```

---

## 📋 Core Tables

### `users`
Stores system accounts and credentials.
- `role`: Enum (`nurse`, `supervisor`, `admin`, `housekeeping`, `auditor`).
- `ward_id`: Links user to a specific hospital ward (US-6.3).

### `beds`
The living state of all monitorable beds.
- `current_stage_id`: Points to the current stage in the 8-stage workflow.
- `patient_start_time`: Reset on discharge, used to calculate total length of stay (LoS).
- `is_virtual`: True if the bed is not a physical unit but part of surge capacity.

### `bed_stage_logs`
The source of truth for all historical movement.
- **Immutability**: Once a log is closed (recorded with duration), it is structurally immutable.
- `duration_ms`: Calculated server-side at the next transition to ensure sub-millisecond accuracy.

### `patient_admissions`
Archival table for completed patient stays.
- Created atomically when a bed is discharged.
- Stores total LoS and notes for long-term analytics.

---

## ⚡ Performance Optimizations

### Indexes
- **Search**: `idx_users_username` and `idx_beds_bed_number` for instant lookup.
- **Real-time**: `idx_beds_occupied` and `idx_beds_stage` to power the dashboard filter bar.
- **Analytics**: `idx_bed_logs_transition_time` and `idx_patient_admissions_discharged_at` (DESC) for fast historical reporting and AI summaries.

### Constraints
- **Foreign Keys**: Enforced at the DB level to prevent orphaned logs or data corruption.
- **Uniqueness**: `bed_number` and `username` have unique constraints to prevent duplication.
- **Audit Triggers**: Some tables include immutability triggers (e.g., `audit_logs`) to prevent tampering after-the-fact.
