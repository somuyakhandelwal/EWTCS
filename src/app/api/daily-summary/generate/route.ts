// API Route — EPIC 9: Daily AI Summary Generator
// POST /api/daily-summary/generate  → trigger aggregation for a given date
// GET  /api/daily-summary/generate  → fetch recent summaries (last 30 days)
//
// Auth is enforced inside the server actions (requireRole).
// This route is callable by: admin UI button, external cron job, or scheduler.

import { NextRequest, NextResponse } from 'next/server'
import { generateDailySummary, fetchRecentDailySummaries } from '@/features/ai-summary/actions/daily-summary-actions'

export const dynamic = 'force-dynamic'

/**
 * POST /api/daily-summary/generate
 * Body (optional JSON): { "date": "YYYY-MM-DD" }
 * Defaults to yesterday if date is omitted.
 * Idempotent — safe to call multiple times for the same date.
 */
export async function POST(req: NextRequest) {
    try {
        let rawInput: { date?: string } = {}

        // Only parse body if content-type indicates JSON
        const contentType = req.headers.get('content-type') ?? ''
        if (contentType.includes('application/json')) {
            rawInput = await req.json().catch(() => ({}))
        }

        const result = await generateDailySummary(rawInput)

        if (!result.success) {
            return NextResponse.json(result, { status: 400 })
        }

        return NextResponse.json(result, { status: 200 })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Server error'
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
}

/**
 * GET /api/daily-summary/generate?limit=30
 * Returns the most recent N daily summaries (default 30).
 * Requires admin, supervisor, or auditor role.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '30', 10), 90)

        const result = await fetchRecentDailySummaries(limit)

        if (!result.success) {
            return NextResponse.json(result, { status: 400 })
        }

        return NextResponse.json(result, { status: 200 })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Server error'
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
}
