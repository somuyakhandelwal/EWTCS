# EPIC 9: Daily AI Summary Generator — Unified Implementation Plan

## Executive Summary

This document treats **US-9.1**, **US-9.2**, and **US-9.3** as a single integrated feature. The three stories form a cohesive workflow: AI generates a structured summary with confidence scores → Supervisor reviews, edits, and approves → Summary is published only after approval.

---

## 1. Story Relationships & Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  US-9.1: AI Summary Generation (200–300 words, insights, trends)            │
│  Uses: daily-aggregation-queries (aggregated data)                           │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  US-9.2: Supervisor Review & Approval                                        │
│  Depends: US-9.1, US-5.2 (session/auth — already implemented)               │
│  Saves as Draft → Notify → Edit → Approve/Reject → Publish                   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  US-9.3: Confidence Scores per Insight                                       │
│  Depends: US-9.2 (displayed in review UI)                                   │
│  Per-insight confidence 0–100%, low-confidence highlighting, flag for review│
└─────────────────────────────────────────────────────────────────────────────┘
```

**Unified Flow:**
1. Admin/Supervisor triggers generation (or cron).
2. AI produces 200–300 word summary + structured insights with confidence scores.
3. Summary is saved with status `Draft`.
4. Supervisor is notified (in-app badge/banner).
5. Supervisor opens review UI → sees summary + insights with confidence.
6. Supervisor edits text, flags low-confidence items.
7. Supervisor approves → status `Published` or rejects → status `Rejected`.

---

## 2. Current State Analysis

### Implemented

| Component | Location | Status |
|-----------|----------|--------|
| Daily aggregation | `ai-summary/lib/daily-aggregation-queries.ts` | ✅ Complete |
| AI text generation | `ai-summary/lib/ai-service.ts` | ⚠️ Partial (3–4 sentences vs 200–300 words) |
| Daily summary store | `ai-summary/lib/daily-summary-store.ts` | ⚠️ No status/insights columns |
| Generate action | `ai-summary/actions/daily-summary-actions.ts` | ⚠️ Direct save, no Draft flow |
| UI components | `DailySummaryCard`, `DailySummaryTrigger`, `DailySummaryHistory` | ⚠️ No review/edit, no confidence |
| Admin dashboard | `app/admin/page.tsx` | ✅ Shows summaries |
| Supervisor dashboard | `app/supervisor/page.tsx` | ❌ No summary section |

### Missing

- **US-9.1:** 200–300 word summary; structured insights; explicit trends/bottlenecks/successes.
- **US-9.2:** Draft/Published/Rejected status; supervisor edit; approve/reject; notification.
- **US-9.3:** Confidence score per insight; low-confidence highlighting; flag for review; transparent calculation.

---

## 3. Database Schema Changes

### Migration: Add workflow and confidence columns

Create `migrations/034_daily_summary_workflow_and_insights.sql`:

```sql
-- Migration 034: Daily summary workflow (US-9.2) and insights with confidence (US-9.3)
-- Status: draft | published | rejected
-- ai_insights: JSONB array of { text, confidence, flagged }
-- reviewed_by, reviewed_at, published_at for audit

ALTER TABLE daily_summaries
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'rejected')),
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '[]'::JSONB;

-- Index for fetching drafts pending review
CREATE INDEX IF NOT EXISTS idx_daily_summaries_status
  ON daily_summaries (status) WHERE status = 'draft';
```

**Backward compatibility:** Existing rows get `status = 'draft'`. Admin can approve historical summaries manually.

---

## 4. Type Definitions

### `ai-summary/types/daily-summary.ts`

Add/update:

```typescript
/** Status of the daily summary in the review workflow */
export type DailySummaryStatus = 'draft' | 'published' | 'rejected'

/** Single AI insight with confidence score (US-9.3) */
export interface AiInsight {
  id: string
  text: string
  confidence: number  // 0–100
  category?: 'trend' | 'bottleneck' | 'success' | 'volume' | 'metric'
  flagged?: boolean
}

/** Extended metadata including insights */
export interface DailySummaryMetadata {
  mostDelayedStage?: string
  insights?: AiInsight[]
}

/** DailySummary: add status, reviewedBy, reviewedAt, publishedAt, aiInsights */
// (extend existing interface)
```

---

## 5. AI Service Enhancement (US-9.1 + US-9.3)

### Requirements

- 200–300 word narrative summary.
- Structured insights (bottlenecks, successes, trends).
- Confidence per insight (0–100%).
- Transparent calculation: base confidence on data completeness and sample size.

### Suggested structure

**File:** `ai-summary/lib/ai-service.ts` (split if >200 lines into `ai-service.ts` + `ai-prompts.ts`)

1. **Prompt update:** Request JSON response with:
   - `narrative`: 200–300 word summary (clear, professional).
   - `insights`: Array of `{ text, category, confidence }`.

2. **Confidence logic (transparent):**
   - High (≥80%): Stats from large sample (e.g. >10 patients, significant stage updates).
   - Medium (50–79%): Moderate data.
   - Low (&lt;50%): Sparse data (e.g. &lt;3 patients), missing fields, or extrapolation.

3. **Validation:** Zod schema for AI response; fallback to safe defaults on parse failure.

---

## 6. Store & Actions

### `daily-summary-store.ts`

- Extend `upsertDailySummary` to handle `status`, `ai_insights`, `reviewed_by`, `reviewed_at`, `published_at`.
- Add `updateDailySummaryStatus(id, status, reviewedBy, reviewedAt)`.
- Add `updateDailySummaryText(id, aiSummary, aiInsights)` for supervisor edits.
- Add `getDraftSummariesPendingReview()` for supervisor dashboard.

### `daily-summary-actions.ts`

- `generateDailySummary`: Save with `status: 'draft'` (not `published`).
- `updateSummaryDraft`: Supervisor edits text and/or insights (Zod validation).
- `approveSummary`: Set `status: 'published'`, `published_at`, `reviewed_by`, `reviewed_at`.
- `rejectSummary`: Set `status: 'rejected'`, `reviewed_by`, `reviewed_at`.
- `flagInsight`: Toggle `flagged` on a specific insight.
- Add `fetchDraftSummariesPendingReview()` for supervisor UI.

---

## 7. Validation Schemas (Zod)

### New schemas

- `approveSummarySchema`: `{ id: z.string().uuid() }`
- `rejectSummarySchema`: `{ id: z.string().uuid(), reason?: z.string().max(500) }`
- `updateSummaryDraftSchema`: `{ id, aiSummary, aiInsights }` with constraints:
  - `aiSummary`: 50–500 words.
  - `aiInsights`: Array of `{ id, text, confidence, flagged }`, confidence 0–100.
- `flagInsightSchema`: `{ summaryId, insightId }`

All inputs validated before DB/action execution.

---

## 8. UI Components (Feature-first)

### New components (max 200 lines each)

| Component | Purpose |
|-----------|---------|
| `DailySummaryReviewCard` | Draft summary with edit/approve/reject for supervisors |
| `DailySummaryEditForm` | Editable text area + insight list with confidence badges |
| `InsightWithConfidence` | Single insight + confidence % + “flag for review” |
| `SupervisorSummaryBanner` | In-app notification when drafts await review |
| `DailySummaryStatusBadge` | Draft / Published / Rejected badge |

### Updates

- `DailySummaryCard`: Show status badge; hide Edit/Approve for non-supervisors and non-drafts.
- `DailySummaryHistory`: Filter by status (draft/published); highlight drafts for supervisor.

---

## 9. Routes & Access Control

- **Admin:** `POST /api/daily-summary/generate` → creates Draft.
- **Supervisor:** Review page or section (e.g. `/supervisor/summaries` or embedded in `/supervisor`).
- **Supervisor actions:** Edit draft, approve, reject, flag insight — all require `requireRole(['supervisor', 'admin'])`.
- **Auditor:** Read-only access to published summaries.

---

## 10. Notification (US-9.2)

**Minimal in-app approach (US-5.2 satisfied by existing auth/session):**

- Query: count of summaries with `status = 'draft'`.
- Display: `SupervisorSummaryBanner` on supervisor dashboard when count > 0.
- Optional: Add `draft_summary_count` to session or a lightweight API for badge.

No email/push needed for MVP; can be added later under EPIC 15.

---

## 11. Implementation Phases

### Phase 1: Data layer (2–3 days)

1. Add migration `034_daily_summary_workflow_and_insights.sql`.
2. Update `DailySummary` types and `DailySummaryMetadata`.
3. Extend `daily-summary-store.ts` (upsert, status update, edit).
4. Add Zod schemas for all new actions.

### Phase 2: AI enhancement (2 days)

1. Update `ai-service.ts` for 200–300 word narrative + structured insights.
2. Implement confidence calculation (data-driven, transparent).
3. Add Zod validation for AI response.
4. Keep file size ≤200 lines (split into `ai-prompts.ts` if needed).

### Phase 3: Actions & API (1–2 days)

1. `generateDailySummary` → save Draft.
2. Add `updateSummaryDraft`, `approveSummary`, `rejectSummary`, `flagInsight`.
3. Add `fetchDraftSummariesPendingReview`.
4. Update API route to support new actions if needed.

### Phase 4: Supervisor UI (2–3 days)

1. Add Daily Summary section to supervisor dashboard.
2. Implement `DailySummaryReviewCard`, `DailySummaryEditForm`, `InsightWithConfidence`.
3. Add `SupervisorSummaryBanner` for draft notifications.
4. Wire approve/reject/edit/flag to server actions.

### Phase 5: Integration & polish (1 day)

1. Update `DailySummaryCard` for status and confidence display.
2. Add tests for store, actions, and schemas.
3. Update documentation and API docs.

---

## 12. Contributing Compliance Checklist

Per [CONTRIBUTING.md](../CONTRIBUTING.md):

- [x] Feature-first: all code under `src/features/ai-summary/`
- [x] File size ≤200 lines; split if needed
- [x] Naming: kebab-case files, PascalCase components, camelCase functions
- [x] Zod validation for all inputs
- [x] No hardcoded secrets; use env vars
- [x] Parameterized queries only
- [x] Audit logging for approve/reject
- [x] Commit format: `feat: ...` for new features
- [x] Branch: `feature/issue-9-epic9-daily-ai-summary-workflow`

---

## 13. Definition of Done Validation

| Criteria | Verification |
|----------|---------------|
| AI generates 200–300 word summary | Unit test + manual check |
| Summary includes insights and trends | AI response schema validation |
| Professional language | Prompt + manual review |
| Bottlenecks and successes highlighted | Prompt + category in insights |
| Draft status on generation | Store test |
| Supervisor notification | Banner visible when drafts exist |
| Edit summary text | `updateSummaryDraft` + UI |
| Approve/reject | Actions + UI |
| Publish only after approval | Status flow test |
| Confidence 0–100% per insight | Schema + display |
| Low confidence highlighted | UI (e.g. amber/red) |
| Transparent calculation | Docstring + comments |
| Flag low-confidence items | `flagInsight` + UI |
| Confidence stored with summary | DB + types |

---

## 14. Risk & Mitigations

| Risk | Mitigation |
|------|------------|
| AI returns malformed JSON | Strict Zod parse with fallback to safe defaults |
| Large prompt response | Enforce max tokens; truncate if needed |
| Concurrent edits | Optimistic locking or `updated_at` check |
| US-5.2 notification scope | Use in-app banner only; defer email to EPIC 15 |

---

## 15. File Change Summary

| File | Action |
|------|--------|
| `migrations/034_daily_summary_workflow_and_insights.sql` | Create |
| `ai-summary/types/daily-summary.ts` | Extend |
| `ai-summary/lib/ai-service.ts` | Major update |
| `ai-summary/lib/ai-prompts.ts` | Create (if split) |
| `ai-summary/lib/daily-summary-store.ts` | Extend |
| `ai-summary/actions/daily-summary-actions.ts` | Extend |
| `ai-summary/schemas/*.ts` | Add new schemas |
| `ai-summary/components/*` | Add/modify components |
| `app/supervisor/page.tsx` | Add summary section |
| `scripts/run-migrations.js` | Register migration 034 |
| `docs/AI_SUMMARY_GUIDE.md` | Update |
| `src/features/README.md` | Update ai-summary section |

---

*Document version: 1.0 | Last updated: 2025-02-21*
