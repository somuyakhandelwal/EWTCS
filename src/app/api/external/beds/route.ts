import { NextResponse } from 'next/server'
import { getAllBeds } from '@/features/bed-dashboard/lib/bed-queries'
import { isRateLimited } from '@/shared/lib/rate-limit'

const API_KEY = process.env.EXTERNAL_API_KEY || 'default-hospital-api-key'

export async function GET(request: Request) {
    // Authentication via API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== API_KEY) {
        return NextResponse.json(
            { error: 'Unauthorized. Please provide a valid x-api-key header.' },
            { status: 401 }
        )
    }

    // Rate Limiting (per IP or default identifier)
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
    const identifier = `external-beds-${ip}`

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
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
