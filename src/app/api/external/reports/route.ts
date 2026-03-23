import { NextResponse } from 'next/server'
import { getBedPerformanceReport } from '@/features/management-report/lib/bed-performance-queries'
import { isRateLimited } from '@/shared/lib/rate-limit'
import { getClientIpFromHeaders } from '@/shared/lib/request-ip'
import { logger } from '@/shared/config/logger'

const API_KEY = process.env.EXTERNAL_API_KEY

export async function GET(request: Request) {
    if (!API_KEY) {
        logger.error('EXTERNAL_API_KEY is not configured for external reports API')
        return NextResponse.json(
            { error: 'External API is not configured on this environment.' },
            { status: 503 }
        )
    }

    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== API_KEY) {
        return NextResponse.json(
            { error: 'Unauthorized. Please provide a valid x-api-key header.' },
            { status: 401 }
        )
    }

    const { searchParams } = new URL(request.url)
    const startStr = searchParams.get('startDate')
    const endStr = searchParams.get('endDate')

    // Parse start/end date, defaulting to last 30 days
    const startDate = startStr
        ? new Date(startStr)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const endDate = endStr ? new Date(endStr) : new Date()

    // Rate Limiting
    const ip = getClientIpFromHeaders(request.headers) || 'unknown-ip'
    const userAgent = request.headers.get('user-agent') || 'unknown-ua'
    const identifier = `external-reports-${ip}-${userAgent}`

    // Limit to 30 requests per minute
    if (isRateLimited(identifier, 30, 60 * 1000)) {
        return NextResponse.json(
            { error: 'Too Many Requests from this IP. Rate limit is 30 requests per minute.' },
            { status: 429 }
        )
    }

    try {
        const report = await getBedPerformanceReport(startDate, endDate)
        return NextResponse.json({
            status: 'success',
            data: { report }
        })
    } catch {
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
