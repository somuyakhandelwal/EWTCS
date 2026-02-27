# EWTCS Project Documentation

Welcome to the central documentation hub for the **Emergency Ward Bed Status Monitoring System (EWTCS)**.

## 📌 Project Overview
EWTCS is a high-reliability, real-time monitoring solution designed for hospital emergency wards. It tracks patient flow through 8 critical stages, provides AI-powered operational insights, and maintains an immutable audit trail for clinical compliance.

## 📖 Key Documentation

### [1. Source Tree Analysis](./source-tree-analysis.md)
Detailed breakdown of the project's codebase, feature modules, and critical entry points.

### [2. Data Model Documentation](./data-model.md)
Relational schema overview identifying core entities (Beds, Logs, Admissions) and their relationships.

### [3. Project Scan Report](./project-scan-report.json)
The technical state file summarizing the findings from the deep-scan documentation process.

---

## 🎯 Architecture Goals
- **Real-time Synchronization**: Nurse desks stay updated across sessions.
- **Auditability**: Every stage change is timestamped and attributed to a user.
- **Intelligence**: Automating the "bottleneck" identification via AI.
- **Resilience**: Automated data retention and archival to prevent performance degradation over time.
