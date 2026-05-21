# EWTCS — Data Flow: Archival, Monitoring, External & Department Modules

> This document is part 2 of the Data Flow diagrams. See [DATA_FLOW.md](./DATA_FLOW.md) for the core operations, patient admission, stage update validation, and AI summary generation flows.

---

## 5. Data Archival Flow

```mermaid
flowchart TD
    A["Monthly Cron Job<br>GET /api/cron/archival<br>Bearer: CRON_SECRET"]

    B["Read retention config<br>system_settings table"]
    C["Calculate cutoff dates<br>per table"]

    D{"requires_approval?"}

    E["INSERT archival_runs<br>status = pending_approval"]
    F["Admin reviews in UI"]
    G{"Approve?"}
    H["Reject — no data moved"]

    I["INSERT archival_runs<br>status = running"]
    J["FOR EACH table:<br>patient_admissions<br>audit_logs<br>bed_stage_logs"]

    K["INSERT INTO _archive<br>SELECT * WHERE date < cutoff"]
    L["DELETE FROM live table<br>WHERE id IN archived"]

    M["UPDATE archival_runs<br>status = completed<br>rows_archived = JSON"]

    N["Archive tables<br>No FK constraints<br>Cold storage"]

    A --> B --> C --> D
    D -->|Yes| E --> F --> G
    G -->|Yes| I
    G -->|No| H
    D -->|No| I
    I --> J --> K --> L --> M --> N

    style A fill:#607D8B,color:#fff
    style E fill:#FF9800,color:#fff
    style M fill:#4CAF50,color:#fff
    style N fill:#9E9E9E,color:#fff
```

---

## 6. System Health & Monitoring Flow

```mermaid
flowchart TD
    subgraph Monitoring["Health Monitoring Pipeline"]
        Logger["Logger (shared/config/logger.ts)<br>Logs all events by level"]
        ErrorStore["Error Store (lib/server/error-store.ts)<br>Persists ERROR/CRITICAL to DB"]
        EE["error_events table"]
        Metrics["System Metrics<br>CPU, Memory, Pool stats"]
    end

    subgraph Endpoints["API Endpoints"]
        Health["GET /api/health<br>Public — uptime check"]
        Errors["GET /api/monitoring/errors<br>Admin — error dashboard"]
        Track["POST /api/monitoring/track<br>Request tracking"]
    end

    subgraph Alerting["External Alerting"]
        Webhook["ERROR_ALERT_WEBHOOK_URL<br>Slack / Teams / Custom"]
        BackupHook["BACKUP_ALERT_WEBHOOK_URL<br>Backup failure alerts"]
    end

    Logger -->|ERROR/CRITICAL| ErrorStore
    ErrorStore --> EE
    Logger -->|On threshold| Webhook

    Health --> Metrics
    Errors --> EE
    Track --> Metrics

    subgraph Backup["Backup Pipeline"]
        BackupCron["Scheduled Backup<br>npm run backup:run"]
        BackupExec["execBackup()<br>pg_dump + gzip + AES encrypt"]
        BackupFiles["backups/ directory<br>ewtcs_backup_*.sql.gz.enc"]
        BackupVerify["npm run backup:verify"]
    end

    BackupCron --> BackupExec --> BackupFiles
    BackupExec -->|Failure| BackupHook
    BackupFiles --> BackupVerify
```

---

## 7. External Integration Flow

```mermaid
flowchart LR
    subgraph External["External Hospital Systems"]
        HIS["Hospital Information System"]
        BMS["Bed Management System"]
        Dashboard["Status Dashboard"]
    end

    subgraph EWTCS_API["EWTCS External API"]
        BedStatus["GET /api/external/beds<br>Rate: 60 req/min"]
        Reports["GET /api/external/reports<br>Rate: 30 req/min"]
        Docs["GET /api/external/docs<br>OpenAPI 3.0 spec"]
    end

    subgraph Auth["API Key Auth"]
        APIKey["x-api-key header<br>EXTERNAL_API_KEY env var"]
        RateLimit["IP-based rate limiting<br>In-memory counter"]
    end

    HIS -->|x-api-key| APIKey
    BMS -->|x-api-key| APIKey
    Dashboard -->|x-api-key| APIKey
    APIKey --> RateLimit
    RateLimit --> BedStatus
    RateLimit --> Reports
    Docs --> External
```

---

## 8. Department Module Flow (EPIC 20)

```mermaid
flowchart TD
    subgraph Arrival["ER Patient Arrival"]
        Patient(["Patient arrives at ER"])
        Assign["Nurse assigns bed<br>Bed: Empty → Initial Investigation"]
    end

    subgraph ERIntake["ER Intake (US-20.1) ⚠️ Schema Only"]
        Triage["Record chief complaint & triage level<br>symptom, triage_level"]
        Vitals["Record vital signs<br>bp, hr, temp, rr, o2"]
        TriageDB[("er_intake table<br>AES-256 encrypted")]
    end

    subgraph Diagnosis_Module["Diagnosis (US-20.2) ⚠️ Schema Only"]
        DoctorExam["Doctor examines patient"]
        DiagRecord["Record diagnosis<br>ICD-10 code, severity"]
        DiagDB[("diagnosis table<br>AES-256 encrypted")]
    end

    subgraph Decision["Decision Point"]
        Route{"Treatment<br>pathway?"}
    end

    subgraph OT_Module["OT Procedures (US-20.3) ⚠️ DB + Metrics"]
        OTSchedule["Schedule surgery"]
        OTAssign["Assign OT Room<br>surgeon + anesthetist"]
        OTTrack["Track procedure<br>SCHEDULED → IN_PROGRESS<br>→ COMPLETED"]
        OTDB[("ot_procedures table<br>→ links to ot_rooms")]
    end

    subgraph CathLab_Module["Cath Lab (US-24.1) ✅ Fully Implemented"]
        CathSchedule["Schedule cath procedure"]
        CathAssign["Assign cardiologist"]
        CathTrack["Track procedure<br>CAG / PTCA / other<br>stenosis %, interventions"]
        CathDB[("cath_lab_procedures table<br>full UI + forms")]
    end

    subgraph Discharge_Path["Post-Procedure"]
        PostOp["Post-op monitoring<br>Bed: Initial Treatment → Observation → Decision Made"]
        DischargeFlow["Standard discharge flow<br>(see DATA_FLOW.md diagram 2)"]
    end

    Patient --> Assign
    Assign --> Triage
    Triage --> Vitals
    Vitals --> TriageDB
    TriageDB --> DoctorExam
    DoctorExam --> DiagRecord
    DiagRecord --> DiagDB
    DiagDB --> Route

    Route -->|Surgery needed| OTSchedule
    Route -->|Cardiac procedure| CathSchedule
    Route -->|Conservative| PostOp

    OTSchedule --> OTAssign --> OTTrack --> OTDB
    OTDB --> PostOp

    CathSchedule --> CathAssign --> CathTrack --> CathDB
    CathDB --> PostOp

    PostOp --> DischargeFlow

    style Patient fill:#4CAF50,color:#fff
    style TriageDB fill:#FF9800,color:#fff
    style DiagDB fill:#FF9800,color:#fff
    style OTDB fill:#FF9800,color:#fff
    style CathDB fill:#2196F3,color:#fff
    style Route fill:#9C27B0,color:#fff
    style DischargeFlow fill:#607D8B,color:#fff
```
