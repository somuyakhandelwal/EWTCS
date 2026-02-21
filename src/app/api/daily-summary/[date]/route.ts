// API Route — EPIC 9: Daily AI Summary Generator
// GET /api/daily-summary/[date]  → fetch the summary for a specific YYYY-MM-DD date
//
// Returns 200 + summary when found, 404 when not yet generated, 400 on bad date format.
// Auth is enforced inside the server action (requireRole).

import { NextRequest, NextResponse } from 'next/server'
import { fetchDailySummaryByDate } from '@/features/ai-summary/actions/daily-summary-actions'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * GET /api/daily-summary/[date]
 * Path param: date — must be YYYY-MM-DD
 * Returns the daily summary for that date, or 404 if it has not been generated yet.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: { date: string } }
) {
    const { date } = params

    if (!ISO_DATE_RE.test(date)) {
        return NextResponse.json(
            { success: false, error: 'Invalid date format — expected YYYY-MM-DD' },
            { status: 400 }
        )
    }

    try {
        const result = await fetchDailySummaryByDate(date)

        if (!result.success) {
            return NextResponse.json(result, { status: 500 })
        }

        if (!result.summary) {
            return NextResponse.json(
                { success: false, error: `No summary found for ${date}` },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, summary: result.summary }, { status: 200 })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
