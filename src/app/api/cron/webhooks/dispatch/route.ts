import { NextRequest, NextResponse } from 'next/server'
import { dispatchDueWebhooks } from '@/features/external-integration/lib/webhook-dispatcher'
import { queueDelayThresholdExceededEvents } from '@/features/external-integration/lib/delay-threshold-events'
import { logger } from '@/shared/config/logger'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limitRaw = request.nextUrl.searchParams.get('limit')
  const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : 25
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 200)
    : 25

  try {
    const queuedDelayEvents = await queueDelayThresholdExceededEvents()
    const result = await dispatchDueWebhooks(limit)
    return NextResponse.json({ success: true, queuedDelayEvents, ...result })
  } catch (error) {
    logger.error('POST /api/cron/webhooks/dispatch failed', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to dispatch webhooks' },
      { status: 500 }
    )
  }
}
