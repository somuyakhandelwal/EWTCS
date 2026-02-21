# Performance Guidelines — EPIC 13: System Performance & Reliability

## SLA Targets

| Page | Target | Metric |
|------|--------|--------|
| Dashboard | `p95 < 2 000 ms` | Full page load (session verify + bed grid fetch) |
| Reports / Analytics | `p95 < 3 000 ms` | All analytics sections loaded |

"Standard hospital network" is defined as: 50 Mbit/s LAN, RTT < 5 ms to server, modern browser (Chrome / Edge, last 2 major versions).

---

## Architecture Decisions for Performance

### 1. DB Indexes (migration 022)

`migrations/022_add_performance_indexes.sql` adds indexes on every hot path:

| Table | Index | Query it accelerates |
|-------|-------|----------------------|
| `bed_stage_logs` | `(bed_id, transition_time DESC)` | Transition queries, wait-time LATERAL join |
| `bed_stage_logs` | `(transition_time DESC)` | Date-range analytics filters |
| `bed_stage_logs` | `(to_stage_id)` | Stage duration stats GROUP BY |
| `bed_stage_logs` | `(from_stage_id)` | TAT queries |
| `beds` | partial `(is_active=true)` | All bed listings |
| `beds` | partial `(is_active=true, is_occupied=true)` | Wait-time query |
| `stage_delay_thresholds` | unique `(stage_id)` | Per-stage threshold lookup |
| `disposition_delay_reasons` | partial `(bed_id, recorded_at DESC) WHERE resolved_at IS NULL` | LATERAL bottleneck join |
| `system_settings` | unique `(key)` | Threshold lookup |
| `stages` | `(LOWER(name))` | TAT stage name matching |

Run via:
```bash
node scripts/run-migrations.js
```

---

### 2. Eliminated N+1 Queries

**`transition-queries.ts` — `getStageTransitions`**

Before: a correlated subquery per log row (`SELECT MIN ... WHERE bed_id = X AND time > Y`).
After: `LEAD() OVER (PARTITION BY bed_id ORDER BY transition_time ASC)` — single pass.

**`wait-time-queries.ts` — `getBedsSortedByCurrentWaitTime`**

Before: two correlated subqueries per bed row (2 N round-trips).
After: a single `LATERAL JOIN` with `MAX(transition_time)` using the composite index.

**`wait-time-queries.ts` — `getBedAnalyticsSummary`**

Before: two correlated subqueries per bed row inside an aggregate.
After: a single CTE that groups `bed_stage_logs` once, then joins — O(N log N) instead of O(N²).

---

### 3. Server-Side Result Caching

Expensive read queries are wrapped with `withCache` from `src/shared/lib/query-cache.ts`.

| Query | Cache TTL | Cache Tag |
|-------|-----------|-----------|
| `getGlobalThresholdMinutes` | 120 s | `system-settings` |
| `getStageDurationStats` | 60 s | `analytics` |
| `getBedAnalyticsSummary` | 60 s | `analytics` |

Cache tags allow surgical invalidation:
- `revalidateTag('system-settings')` is called by `setGlobalThresholdAction` after any admin threshold change.
- `revalidateTag('analytics')` should be called after any stage-log mutation if real-time analytics are needed.

---

### 4. Slow Query Detection

Every DB query in `src/shared/lib/db.ts` is timed. Thresholds:

| Duration | Log Level | Meaning |
|----------|-----------|---------|
| > 500 ms | `WARN` | Slow query — investigate index coverage |
| > 2 000 ms | `ERROR` | Very slow — SLA breach risk; escalate immediately |

Search production logs for `Slow query` or `Very slow query` to find regressions.

---

### 5. Runtime SLA Instrumentation

The dashboard server action (`getBedGridData`) uses `measurePerformance` from
`src/shared/lib/perf-monitor.ts` to log end-to-end latency on every real request.

Logs appear as:
```json
{ "level": "INFO", "message": "Performance measurement", "label": "dashboard.getBedGridData", "durationMs": 312, "slaMs": 2000, "withinSla": true }
```

Or on breach:
```json
{ "level": "WARN", "message": "SLA breach detected", "label": "dashboard.getBedGridData", "durationMs": 2400, "slaMs": 2000, "overageMs": 400 }
```

---

### 6. Health Endpoint

`GET /api/health` now returns:
- `status`: `"healthy"` | `"degraded"`
- `database.reachable`: boolean
- `database.pool`: connection-pool utilisation stats

Use this endpoint for uptime monitoring and to trigger alerts when the DB becomes unreachable.

---

## How to Run Performance Tests

```bash
# Unit tests for perf-monitor utilities
npm test -- src/__tests__/perf-monitor.test.ts

# Automated realistic-volume performance gate (seed + p95 check)
npm run perf:validate

# Or run steps independently
npm run perf:seed
npm run perf:check

# Optional manual browser check (network profile)
node scripts/simulate-occupied-beds.mjs
```

---

## Regression Alerts

Configure your monitoring system to alert when:

1. `GET /api/health` returns `503` for > 2 minutes — DB unreachable.
2. Log search matches `"SLA breach detected"` sustained for > 10 minutes.
3. Log search matches `"Very slow query"` more than 5 times in 1 minute.

CI regression alert path (enabled):
- `.github/workflows/pre-merge-checks-core.yml` runs `npm run perf:seed` and `npm run perf:check`.
- `perf:check` exits non-zero and prints `🚨 ALERT: Performance regression detected` when p95 breaches SLA.

---

## Definition of Done (EPIC 13 Checklist)

- [x] DB indexes applied via migration 022
- [x] N+1 queries eliminated in `transition-queries.ts` and `wait-time-queries.ts`
- [x] Slow-query detection and logging in `db.ts`
- [x] Server-side result caching for expensive analytics queries
- [x] Threshold cache with mutation-triggered invalidation
- [x] Enhanced health endpoint with DB probe and pool stats
- [x] `perf-monitor.ts` utility with `measurePerformance` / `logPerf` API
- [x] Runtime SLA instrumentation on the dashboard action
- [x] Unit tests for perf-monitor utilities
- [x] Validate p95 < 2 s for Dashboard on realistic local/CI volume
- [x] Validate p95 < 3 s for Reports on realistic local/CI volume
- [x] Configure regression alert path (CI fail + alert logs)
