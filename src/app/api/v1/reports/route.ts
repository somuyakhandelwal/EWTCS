/**
 * External REST API — Reports
 * US-19.1: REST API for External Systems
 *
 * GET /api/v1/reports?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *   Returns daily trend data and aggregate metrics for the given date range.
 *   Authentication: Bearer <EXTERNAL_API_KEY>
 *   Max range: 31 days
 *
 * Response: application/json
 * {
 *   metrics: ReportMetrics
 *   trend: DailyTrend[]
 *   dateRange: { start: string, end: string }
 *   generatedAt: string
 * }
 */

import { type NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/shared/lib/api-key-auth'
import { checkRateLimit } from '@/shared/lib/rate-limit'
import { getReportMetrics, getDailyTrend } from '@/features/reports/lib/report-queries'

export const runtime = 'nodejs'

/** Max allowed date range for API queries (31 days) */
const MAX_RANGE_DAYS = 31

export async function GET(request: NextRequest) {
  const auth = verifyApiKey(request)
  if (!auth.ok) return auth.response

  // Rate limit: 60 req/min per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = checkRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please retry after the reset window.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rl.resetAt - Math.floor(Date.now() / 1000)),
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rl.resetAt),
        },
      }
    )
  }

  const { searchParams } = new URL(request.url)
  const startStr = searchParams.get('startDate')
  const endStr   = searchParams.get('endDate')

  if (!startStr || !endStr) {
    return NextResponse.json(
      { error: 'startDate and endDate query parameters are required (format: YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  const start = new Date(`${startStr}T00:00:00Z`)
  const end   = new Date(`${endStr}T23:59:59Z`)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 })
  }

  if (end < start) {
    return NextResponse.json({ error: 'endDate must be after startDate.' }, { status: 400 })
  }

  const rangeDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  if (rangeDays > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Date range cannot exceed ${MAX_RANGE_DAYS} days.` },
      { status: 422 }
    )
  }

  try {
    const [metrics, trend] = await Promise.all([
      getReportMetrics(start, end),
      getDailyTrend(start, end),
    ])

    return NextResponse.json(
      {
        metrics,
        trend,
        dateRange: { start: startStr, end: endStr },
        generatedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
