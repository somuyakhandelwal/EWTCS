# EWTCS — Data Flow Diagrams

---

## 1. Core System Operations Flow

```mermaid
flowchart TD
    subgraph Users["Hospital Users"]
        Nurse["🩺 Nurse"]
        HK["🧹 Housekeeping"]
        Sup["👔 Supervisor"]
        Admin["⚙️ Admin"]
        Auditor["📊 Auditor"]
        Cardio["❤️ Cardiologist"]
        CathNurse["💉 Cath Lab Nurse"]
    end

    subgraph Auth["Authentication Layer"]
        Login["POST /api/auth/login"]
        MW["Edge Middleware<br/>JWT + RBAC"]
        Session["Session Cookie<br/>httpOnly JWT"]
    end

    subgraph Dashboard["Bed Dashboard"]
        BedGrid["Bed Grid UI<br/>Color-coded cards"]
        StageUpdate["One-Click Stage Update<br/>Server Action"]
        Undo["Undo Last Update<br/>POST /api/bed-dashboard/undo"]
        Alerts["Red Alert Indicators<br/>Delay Threshold"]
    end

    subgraph Workflow["8-Stage Patient Workflow"]
        S0["Empty<br/>🔘 gray"]
        S1["Triage<br/>🔵 blue"]
        S2["Registration<br/>🔵 cyan"]
        S3["Doctor Assessment<br/>🟡 yellow"]
        S4["Treatment/Observation<br/>🟠 orange"]
        S5["Decision Made<br/>🟢 green"]
        S6["Discharge Process<br/>🟣 purple"]
        S7["Cleaning<br/>🟤 pink"]
    end

    subgraph Database["PostgreSQL"]
        Beds["beds table"]
        BSL["bed_stage_logs"]
        PA["patient_admissions"]
        AL["audit_logs"]
        ST["stage_transitions"]
    end

    Nurse --> Login
    HK --> Login
    Login --> Session
    Session --> MW
    MW --> BedGrid

    BedGrid --> StageUpdate
    StageUpdate --> ST
    ST -->|Validate| StageUpdate
    StageUpdate --> Beds
    StageUpdate --> BSL
    StageUpdate --> AL

    S0 --> S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7 --> S0

    BedGrid --> Alerts
    Alerts -->|Check| Beds
```

---

## 2. Patient Admission → Discharge Flow

```mermaid
flowchart TD
    Start(["Patient Arrives at ER"])
    
    A["Nurse assigns patient to bed<br/>Bed: Empty → Triage"]
    B["Record patient details<br/>Name, MRD, Symptom<br/>(AES-256 encrypted at rest)"]
    C["Triage assessment complete<br/>Bed: Triage → Registration"]
    D["Registration & documentation<br/>Bed: Registration → Doctor Assessment"]
    E["Doctor examines patient<br/>Bed: Doctor Assessment → Treatment"]
    F["Active treatment / monitoring<br/>Bed: Treatment → Decision Made"]
    
    G{"Disposition<br/>bottleneck?"}
    G1["Record delay reason<br/>disposition_delay_reasons table<br/>no_bed_upstairs, awaiting_transport, etc."]
    
    H["Discharge decision made<br/>Bed: Decision Made → Discharge Process"]
    I["Patient discharged/transferred<br/>Bed: Discharge Process → Cleaning"]
    
    J["INSERT patient_admissions<br/>(immutable archive)"]
    K["Clear bed patient data<br/>Reset patient_start_time"]
    
    L["Housekeeping cleans bed<br/>Bed: Cleaning → Empty"]
    M["Calculate turnaround time<br/>tat_from_previous_discharge_ms"]
    
    End(["Bed Ready for Next Patient"])

    Start --> A
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G -->|Yes| G1
    G1 --> H
    G -->|No| H
    H --> I
    I --> J
    J --> K
    K --> L
    L --> M
    M --> End

    style Start fill:#4CAF50,color:#fff
    style End fill:#4CAF50,color:#fff
    style G fill:#FF9800,color:#fff
    style G1 fill:#f44336,color:#fff
    style J fill:#2196F3,color:#fff
```

---

## 3. Stage Update Validation Flow

```mermaid
flowchart TD
    A["User clicks stage button on bed card"]
    B["Server Action invoked<br/>features/bed-dashboard/actions"]
    C["Verify session<br/>verifyActiveSession()"]
    
    D{"User<br/>authenticated?"}
    E["Return 401 Unauthorized"]
    
    F["Check stage_transitions table<br/>from_stage_id → to_stage_id"]
    G{"Transition<br/>allowed?"}
    H{"Requires supervisor<br/>override?"}
    
    I["Return error:<br/>Transition not allowed"]
    J{"User is<br/>supervisor/admin?"}
    K["Return error:<br/>Supervisor override required"]
    
    L["Execute stage update in transaction"]
    L1["UPDATE beds SET current_stage_id"]
    L2["INSERT bed_stage_logs"]
    L3["INSERT audit_logs"]
    L4["Resolve any active disposition delays"]
    
    M["Return success"]

    A --> B --> C --> D
    D -->|No| E
    D -->|Yes| F --> G
    G -->|Blocked| H
    G -->|Allowed| L
    H -->|Yes| J
    H -->|No| I
    J -->|No| K
    J -->|Yes| L
    L --> L1 --> L2 --> L3 --> L4 --> M

    style E fill:#f44336,color:#fff
    style I fill:#f44336,color:#fff
    style K fill:#FF9800,color:#fff
    style M fill:#4CAF50,color:#fff
```

---

## 4. AI Daily Summary Generation Flow

```mermaid
flowchart TD
    A["Trigger<br/>Admin button / Cron job"]
    B["POST /api/daily-summary/generate<br/>{date: YYYY-MM-DD}"]
    C["Server Action:<br/>generateDailySummary()"]
    
    D["Query bed_stage_logs<br/>for target date"]
    E["Query patient_admissions<br/>for target date"]
    F["Aggregate metrics<br/>total_patients, avg_stage_time,<br/>delay_count, avg_tat"]
    
    G["UPSERT daily_summaries<br/>status = draft"]
    
    H{"GEMINI_API_KEY<br/>configured?"}
    I["Call Google Gemini API<br/>gemini-2.5-flash"]
    J["Return placeholder message"]
    
    K["Parse AI response<br/>Extract summary text + insights"]
    L["UPDATE daily_summaries<br/>SET ai_summary, ai_insights"]
    
    M["Supervisor reviews in UI"]
    N{"Approve?"}
    O["SET status = published<br/>reviewed_by, reviewed_at"]
    P["SET status = rejected"]
    
    Q["Report Sign-off<br/>INSERT report_signoffs"]
    R["Report available in analytics"]

    A --> B --> C
    C --> D
    C --> E
    D --> F
    E --> F
    F --> G --> H
    H -->|Yes| I --> K --> L
    H -->|No| J --> L
    L --> M --> N
    N -->|Yes| O --> Q --> R
    N -->|No| P

    style I fill:#673AB7,color:#fff
    style J fill:#FF9800,color:#fff
    style O fill:#4CAF50,color:#fff
    style P fill:#f44336,color:#fff
```

---

## 5. Data Archival Flow

```mermaid
flowchart TD
    A["Monthly Cron Job<br/>GET /api/cron/archival<br/>Bearer: CRON_SECRET"]
    
    B["Read retention config<br/>system_settings table"]
    C["Calculate cutoff dates<br/>per table"]
    
    D{"requires_approval?"}
    
    E["INSERT archival_runs<br/>status = pending_approval"]
    F["Admin reviews in UI"]
    G{"Approve?"}
    H["Reject — no data moved"]
    
    I["INSERT archival_runs<br/>status = running"]
    J["FOR EACH table:<br/>patient_admissions<br/>audit_logs<br/>bed_stage_logs"]
    
    K["INSERT INTO _archive<br/>SELECT * WHERE date < cutoff"]
    L["DELETE FROM live table<br/>WHERE id IN archived"]
    
    M["UPDATE archival_runs<br/>status = completed<br/>rows_archived = JSON"]
    
    N["Archive tables<br/>No FK constraints<br/>Cold storage"]

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
        Logger["Logger (shared/config/logger.ts)<br/>Logs all events by level"]
        ErrorStore["Error Store (lib/server/error-store.ts)<br/>Persists ERROR/CRITICAL to DB"]
        EE["error_events table"]
        Metrics["System Metrics<br/>CPU, Memory, Pool stats"]
    end

    subgraph Endpoints["API Endpoints"]
        Health["GET /api/health<br/>Public — uptime check"]
        Errors["GET /api/monitoring/errors<br/>Admin — error dashboard"]
        Track["POST /api/monitoring/track<br/>Request tracking"]
    end

    subgraph Alerting["External Alerting"]
        Webhook["ERROR_ALERT_WEBHOOK_URL<br/>Slack / Teams / Custom"]
        BackupHook["BACKUP_ALERT_WEBHOOK_URL<br/>Backup failure alerts"]
    end

    Logger -->|ERROR/CRITICAL| ErrorStore
    ErrorStore --> EE
    Logger -->|On threshold| Webhook

    Health --> Metrics
    Errors --> EE
    Track --> Metrics

    subgraph Backup["Backup Pipeline"]
        BackupCron["Scheduled Backup<br/>npm run backup:run"]
        BackupExec["execBackup()<br/>pg_dump + gzip + AES encrypt"]
        BackupFiles["backups/ directory<br/>ewtcs_backup_*.sql.gz.enc"]
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
        BedStatus["GET /api/external/beds<br/>Rate: 60 req/min"]
        Reports["GET /api/external/reports<br/>Rate: 30 req/min"]
        Docs["GET /api/external/docs<br/>OpenAPI 3.0 spec"]
    end

    subgraph Auth["API Key Auth"]
        APIKey["x-api-key header<br/>EXTERNAL_API_KEY env var"]
        RateLimit["IP-based rate limiting<br/>In-memory counter"]
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
    subgraph Arrival["Patient Arrival"]
        Patient(["Patient arrives at ER"])
        Assign["Nurse assigns bed<br/>Bed: Empty → Triage"]
    end

    subgraph ERIntake["ER Intake (US-20.1) ⚠️ Schema Only"]
        Triage["Record chief complaint<br/>symptom, triage_level"]
        Vitals["Record vital signs<br/>bp, hr, temp, rr, o2"]
        TriageDB[("er_intake table<br/>AES-256 encrypted")]
    end

    subgraph Diagnosis_Module["Diagnosis (US-20.2) ⚠️ Schema Only"]
        DoctorExam["Doctor examines patient"]
        DiagRecord["Record diagnosis<br/>ICD-10 code, severity"]
        DiagDB[("diagnosis table<br/>AES-256 encrypted")]
    end

    subgraph Decision["Decision Point"]
        Route{"Treatment<br/>pathway?"}
    end

    subgraph OT_Module["OT Procedures (US-20.3) ⚠️ DB + Metrics"]
        OTSchedule["Schedule surgery"]
        OTAssign["Assign OT Room<br/>surgeon + anesthetist"]
        OTTrack["Track procedure<br/>SCHEDULED → IN_PROGRESS<br/>→ COMPLETED"]
        OTDB[("ot_procedures table<br/>→ links to ot_rooms")]
    end

    subgraph CathLab_Module["Cath Lab (US-24.1) ✅ Fully Implemented"]
        CathSchedule["Schedule cath procedure"]
        CathAssign["Assign cardiologist"]
        CathTrack["Track procedure<br/>CAG / PTCA / other<br/>stenosis %, interventions"]
        CathDB[("cath_lab_procedures table<br/>full UI + forms")]
    end

    subgraph Discharge_Path["Post-Procedure"]
        PostOp["Post-op monitoring<br/>Bed: Treatment → Decision Made"]
        DischargeFlow["Standard discharge flow<br/>(see diagram 2)"]
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
