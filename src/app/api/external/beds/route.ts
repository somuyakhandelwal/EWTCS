import { NextResponse } from 'next/server'
import { getAllBeds } from '@/features/bed-dashboard/lib/bed-queries'
import { isRateLimited } from '@/shared/lib/rate-limit'
import { getClientIpFromHeaders } from '@/shared/lib/request-ip'
import { logger } from '@/shared/config/logger'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.EXTERNAL_API_KEY

export async function GET(request: Request) {
    if (!API_KEY) {
        logger.error('EXTERNAL_API_KEY is not configured for external beds API')
        return NextResponse.json(
            { error: 'External API is not configured on this environment.' },
            { status: 503 }
        )
    }

    // Authentication via API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== API_KEY) {
        return NextResponse.json(
            { error: 'Unauthorized. Please provide a valid x-api-key header.' },
            { status: 401 }
        )
    }

    // Rate Limiting (per IP or default identifier)
    const ip = getClientIpFromHeaders(request.headers) || 'unknown-ip'
    const userAgent = request.headers.get('user-agent') || 'unknown-ua'
    const identifier = `external-beds-${ip}-${userAgent}`

    // limit to 60 requests per minute
    if (isRateLimited(identifier, 60, 60 * 1000)) {
        return NextResponse.json(
            { error: 'Too Many Requests from this IP. Rate limit is 60 requests per minute.' },
            { status: 429 }
        )
    }

    try {
        const beds = await getAllBeds()
        // Read-only endpoint for beds
        return NextResponse.json({
            status: 'success',
            data: { beds }
        })
    } catch {
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
