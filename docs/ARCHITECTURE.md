# EWTCS — Architecture Overview

**Emergency Ward Bed Tracking & Coordination System**

---

## 1. High-Level System Description

EWTCS is a real-time hospital Emergency Ward bed management system. It enables nurses, housekeeping staff, supervisors, auditors, and administrators to monitor and control each bed's status through an **8-stage patient workflow** — from initial investigation through treatment, discharge, and bed cleaning. Triage is modelled as a separate intake area and is not an ER bed stage.

Core capabilities:

- **Real-time Bed Dashboard** — Color-coded grid showing every bed's current stage, with RED alert indicators for delayed patients.
- **One-Click Stage Updates** — Nurses advance beds through workflow stages; transitions are validated against configurable rules.
- **Shift-Based Analytics** — Supervisors view turnaround times, delays, and bottlenecks segmented by shift (Morning, Evening, Night).
- **AI Daily Summary** — Google Gemini-powered daily reports aggregating patient flow, delays, and operational insights.
- **Data Archival & Retention** — Automated monthly archival of historical records with supervisor approval gates.
- **External Integration API** — Read-only API endpoints for other hospital systems.
- **OT Room Tracking** — 16 Operation Theatre rooms with Available/Ongoing status.
- **Cath Lab Module** — Full cardiac catheterization procedure tracking with cardiologist workflow.
- **Department Modules** — ER Intake, Diagnosis, and OT Procedures tables (⚠️ partial — schema ready, UI pending).
- **Audit Trail** — Every action is logged immutably with IP address, user, timestamp, and change details.

---

## 2. Tech Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| **Framework** | Next.js (App Router) | ^15.1.12 |
| **UI** | React | ^19.0.0 |
| **Language** | TypeScript | ^5 |
| **Styling** | Tailwind CSS | ^3.4.17 |
| **Database** | PostgreSQL | Via `pg` (^8.11.3) connection pool |
| **ORM/Migrations** | Raw SQL + `node-pg-migrate` | ^8.0.4 — 68 migration files |
| **Authentication** | Custom JWT via `jose` | HS256, httpOnly cookies |
| **Password Hashing** | `bcrypt` / `bcryptjs` | ^6.0.0 / ^3.0.3 |
| **Validation** | `zod` | ^4.3.6 |
| **AI** | Google Gemini (`@google/generative-ai`) | ^0.24.1 |
| **Charts** | Recharts | ^3.7.0 |
| **Animations** | Framer Motion | ^12.34.3 |
| **PDF Export** | jspdf + html2canvas | |
| **UI Components** | Radix UI (context-menu, label, slot), Lucide React icons | |
| **Testing** | Vitest + @testing-library/react + jsdom | |
| **Deployment** | Docker + Nginx reverse proxy | Dockerfile + docker-compose.yml |

---

## 3. Folder Structure

```
EWTCS/
├── migrations/             # 68 SQL migration files (001_init → 058 + timestamped), run via node-pg-migrate
├── scripts/                # DB setup, seeding, backup, validation, and deployment scripts
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/            # 18 API route handlers (auth, bed-dashboard, backup, cron, etc.)
│   │   ├── admin/          # Admin panel pages
│   │   ├── analytics/      # Analytics/reporting pages
│   │   ├── dashboard/      # Bed grid dashboard (nurse/housekeeping view)
│   │   ├── login/          # Login page
│   │   ├── supervisor/     # Supervisor panel pages
│   │   ├── change-password/# Password change flow
│   │   ├── ot/             # OT Room dashboard
│   │   ├── cath-lab/       # Cath lab procedure dashboard
│   │   ├── triage/         # Triage view
│   │   ├── manual/         # User manual / help pages
│   │   └── _components/    # Shared layout components (header, sidebar, etc.)
│   ├── features/           # 22 feature modules (domain-driven structure)
│   │   ├── auth/           # Auth logic (kiosk, password reset, login helpers)
│   │   ├── bed-dashboard/  # Core bed grid: queries, actions, components, dept metrics
│   │   ├── bed-management/ # Bed CRUD operations
│   │   ├── cath-lab/       # Cath lab procedures (CAG/PTCA) — full feature (EPIC 24)
│   │   ├── ot-dashboard/   # OT room status management — full feature (EPIC 23)
│   │   ├── diagnosis/      # Doctor diagnosis records — schema + actions (EPIC 20)
│   │   ├── ward-management/# Ward CRUD and access control
│   │   ├── stage-management/# Stage configuration and transition rules
│   │   ├── user-management/# User CRUD and role management
│   │   ├── shift-management/# Shift scheduling configuration
│   │   ├── ai-summary/     # Gemini AI daily report generation
│   │   ├── management-report/# Supervisor analytics and reports
│   │   ├── data-retention/ # Archival runner, retention config
│   │   ├── data-encryption/# PGP-level column encryption at rest
│   │   ├── export/         # CSV/PDF export
│   │   ├── import/         # Data import
│   │   ├── notifications/  # Alert preferences and notification system
│   │   ├── adoption/       # User feedback / adoption tracking
│   │   ├── security-scanning/# PII detection, security scanning
│   │   ├── system-health/  # System metrics and health monitoring
│   │   └── help/           # In-app help and guided tours
│   ├── shared/             # Cross-cutting concerns
│   │   ├── lib/            # 29 shared libraries (db, session, audit, auth, PII, rate limiting, etc.)
│   │   ├── config/         # Environment config, logger, secrets, realtime config
│   │   ├── components/     # Shared UI components
│   │   ├── hooks/          # React hooks
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   └── actions/        # Shared server actions
│   ├── lib/server/         # Node.js-only server utilities (backup-exec, error-store)
│   ├── middleware.ts        # Edge middleware: HTTPS, JWT auth, role guards, kiosk IP binding
│   └── __tests__/          # Test files
├── public/                 # Static assets
├── docs/                   # Documentation (this folder)
├── backups/                # Database backup files
├── logs/                   # Runtime log files
├── .env.example            # 220-line env template with full documentation
├── docker-compose.yml      # PostgreSQL + App containers
├── nginx.conf              # Reverse proxy with SSL termination
└── Dockerfile              # Multi-stage production build
```

---

## 4. Data Flow: Request → API → DB → Response

```
┌──────────┐     HTTPS      ┌───────────┐    JWT Cookie    ┌───────────────┐
│  Browser  │ ─────────────▶ │   Nginx   │ ──────────────▶ │  Next.js App  │
│  (React)  │                │  (Proxy)  │                 │  (App Router) │
└──────────┘                 └───────────┘                 └───────┬───────┘
                                                                    │
                                                          ┌────────▼────────┐
                                                          │  middleware.ts   │
                                                          │  (Edge Runtime) │
                                                          │  • HTTPS enforce│
                                                          │  • JWT verify   │
                                                          │  • Role check   │
                                                          │  • Kiosk IP     │
                                                          └────────┬────────┘
                                                                    │
                                              ┌─────────────────────┼─────────────────────┐
                                              │                     │                     │
                                    ┌─────────▼─────────┐ ┌────────▼────────┐   ┌────────▼────────┐
                                    │  Server Actions    │ │  API Routes     │   │  Server         │
                                    │  (features/*/     │ │  (/api/*)       │   │  Components     │
                                    │   actions/)        │ │  route.ts       │   │  (pages)        │
                                    └─────────┬─────────┘ └────────┬────────┘   └────────┬────────┘
                                              │                     │                     │
                                              └─────────────────────┼─────────────────────┘
                                                                    │
                                                          ┌────────▼────────┐
                                                          │  shared/lib/    │
                                                          │  • db.ts (Pool) │
                                                          │  • session.ts   │
                                                          │  • audit.ts     │
                                                          └────────┬────────┘
                                                                    │
                                                          ┌────────▼────────┐
                                                          │   PostgreSQL    │
                                                          │   (pg Pool)     │
                                                          │   max=50 conn   │
                                                          └─────────────────┘
```

**Request lifecycle:**

1. **Client** sends HTTPS request (React SPA or page navigation).
2. **Nginx** terminates SSL, forwards to Next.js on port 3000.
3. **Middleware** (Edge Runtime) intercepts every request:
   - Enforces HTTPS redirect in production/staging.
   - Verifies JWT `session` cookie via `jose`.
   - Checks inactivity timeout (30 min default, configurable).
   - Applies role-based route guards (admin, supervisor, nurse, housekeeping, auditor, doctor, cardiologist, cath_lab_nurse).
   - Validates kiosk session IP binding.
4. **Handler** processes the request:
   - **Server Actions** (for mutations like stage updates, user management).
   - **API Routes** (for RESTful endpoints like login, backup, external).
   - **Server Components** (for SSR pages like dashboard, analytics).
5. **Shared Libraries** provide DB queries (`pg` Pool), audit logging, session management.
6. **PostgreSQL** stores all data. Pool is configured for hospital-grade: max 50 connections, 10 min warm, 10s statement timeout, slow-query monitoring.
7. **Response** returns to client. Successful mutations trigger audit log inserts.

---

## 5. External Services & Environment Variables

> Configuration details, external service integrations, and all environment variable references are documented in
> **[ARCHITECTURE_ENV_CONFIG.md](./ARCHITECTURE_ENV_CONFIG.md)**.

