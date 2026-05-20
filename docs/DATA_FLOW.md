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
        S1["Initial Investigation<br/>🔵 blue"]
        S2["Initial Treatment<br/>🔵 cyan"]
        S3["Drugs/Test<br/>🟡 yellow"]
        S4["Observation<br/>🟠 orange"]
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
    A["Nurse assigns patient to bed<br/>Bed: Empty → Initial Investigation"]
    B["Record patient details<br/>Name, MRD, Symptom<br/>(AES-256 encrypted at rest)"]
    C["Initial assessment & investigations ordered<br/>Bed: Initial Investigation → Initial Treatment"]
    D["First-line treatment administered<br/>Bed: Initial Treatment → Drugs/Test"]
    E["Awaiting medication response/diagnostic tests<br/>Bed: Drugs/Test → Observation"]
    F["Observation & active clinical monitoring<br/>Bed: Observation → Decision Made"]
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
## 5. Archival, Monitoring, External & Department Module Flows
> Diagrams for data archival, system health monitoring, external hospital system integration,
> and EPIC 20 department module flows are documented in
> **[DATA_FLOW_SUPPLEMENTAL.md](./DATA_FLOW_SUPPLEMENTAL.md)**.
