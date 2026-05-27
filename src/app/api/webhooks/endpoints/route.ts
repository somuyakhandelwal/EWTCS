import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyActiveSession } from '@/shared/lib/active-session'
import { query } from '@/shared/lib/db'
import { logAudit } from '@/shared/lib/audit'
import { getClientIpFromHeaders } from '@/shared/lib/request-ip'
import type { WebhookEventType } from '@/features/external-integration/types/webhook.types'

const eventTypes = ['bed.status.changed', 'bed.delay.threshold.exceeded'] as const

const createWebhookEndpointSchema = z.object({
  name: z.string().min(1).max(100),
  targetUrl: z.string().url().max(1000),
  signingSecret: z.string().min(16).max(512),
  subscribedEvents: z.array(z.enum(eventTypes)).min(1),
  timeoutMs: z.number().int().positive().max(120000).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  retryBackoffBaseMs: z.number().int().positive().max(120000).optional(),
})

const updateWebhookEndpointSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  targetUrl: z.string().url().max(1000).optional(),
  signingSecret: z.string().min(16).max(512).optional(),
  subscribedEvents: z.array(z.enum(eventTypes)).min(1).optional(),
  timeoutMs: z.number().int().positive().max(120000).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  retryBackoffBaseMs: z.number().int().positive().max(120000).optional(),
  isActive: z.boolean().optional(),
})

async function requireAdminSession() {
  const session = await verifyActiveSession()
  if (!session || session.role !== 'admin') {
    return null
  }
  return session
}

type WebhookEndpointRow = {
  id: string
  name: string
  targetUrl: string
  subscribedEvents: WebhookEventType[]
  isActive: boolean
  timeoutMs: number
  maxRetries: number
  retryBackoffBaseMs: number
  createdAt: string
  updatedAt: string
}

export async function GET() {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await query<WebhookEndpointRow>(
    `
      SELECT
        id,
        name,
        target_url AS "targetUrl",
        subscribed_events AS "subscribedEvents",
        is_active AS "isActive",
        timeout_ms AS "timeoutMs",
        max_retries AS "maxRetries",
        retry_backoff_base_ms AS "retryBackoffBaseMs",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM webhook_endpoints
      ORDER BY created_at DESC
    `
  )

  return NextResponse.json({ success: true, data: result.rows })
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = createWebhookEndpointSchema.safeParse(await request.json())
  if (!payload.success) {
    return NextResponse.json(
      { success: false, errors: payload.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const data = payload.data
  const result = await query<{ id: string }>(
    `
      INSERT INTO webhook_endpoints (
        name,
        target_url,
        signing_secret,
        subscribed_events,
        timeout_ms,
        max_retries,
        retry_backoff_base_ms,
        created_by_user_id,
        updated_by_user_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
      RETURNING id
    `,
    [
      data.name,
      data.targetUrl,
      data.signingSecret,
      data.subscribedEvents,
      data.timeoutMs ?? 5000,
      data.maxRetries ?? 3,
      data.retryBackoffBaseMs ?? 500,
      session.userId,
    ]
  )

  await logAudit({
    actionType: 'CREATE',
    entityType: 'webhook_endpoint',
    entityId: result.rows[0].id,
    performedBy: session.userId,
    changes: {
      name: data.name,
      targetUrl: data.targetUrl,
      subscribedEvents: data.subscribedEvents,
    },
    metadata: { source: 'api/webhooks/endpoints' },
    ipAddress: getClientIpFromHeaders(request.headers),
  }).catch(() => {})

  return NextResponse.json({ success: true, id: result.rows[0].id }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = updateWebhookEndpointSchema.safeParse(await request.json())
  if (!payload.success) {
    return NextResponse.json(
      { success: false, errors: payload.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const data = payload.data

  const result = await query(
    `
      UPDATE webhook_endpoints
      SET
        name = COALESCE($2, name),
        target_url = COALESCE($3, target_url),
        signing_secret = COALESCE($4, signing_secret),
        subscribed_events = COALESCE($5, subscribed_events),
        timeout_ms = COALESCE($6, timeout_ms),
        max_retries = COALESCE($7, max_retries),
        retry_backoff_base_ms = COALESCE($8, retry_backoff_base_ms),
        is_active = COALESCE($9, is_active),
        updated_by_user_id = $10,
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      data.id,
      data.name ?? null,
      data.targetUrl ?? null,
      data.signingSecret ?? null,
      data.subscribedEvents ?? null,
      data.timeoutMs ?? null,
      data.maxRetries ?? null,
      data.retryBackoffBaseMs ?? null,
      data.isActive ?? null,
      session.userId,
    ]
  )

  if ((result.rowCount ?? 0) === 0) {
    return NextResponse.json({ success: false, error: 'Webhook endpoint not found' }, { status: 404 })
  }

  await logAudit({
    actionType: 'UPDATE',
    entityType: 'webhook_endpoint',
    entityId: data.id,
    performedBy: session.userId,
    changes: {
      name: data.name,
      targetUrl: data.targetUrl,
      subscribedEvents: data.subscribedEvents,
      timeoutMs: data.timeoutMs,
      maxRetries: data.maxRetries,
      retryBackoffBaseMs: data.retryBackoffBaseMs,
      isActive: data.isActive,
    },
    metadata: { source: 'api/webhooks/endpoints' },
    ipAddress: getClientIpFromHeaders(request.headers),
  }).catch(() => {})

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing endpoint id' }, { status: 400 })
  }

  const result = await query(
    `
      UPDATE webhook_endpoints
      SET is_active = FALSE, updated_by_user_id = $2, updated_at = NOW()
      WHERE id = $1
    `,
    [id, session.userId]
  )

  if ((result.rowCount ?? 0) === 0) {
    return NextResponse.json({ success: false, error: 'Webhook endpoint not found' }, { status: 404 })
  }

  await logAudit({
    actionType: 'DEACTIVATE',
    entityType: 'webhook_endpoint',
    entityId: id,
    performedBy: session.userId,
    metadata: { source: 'api/webhooks/endpoints' },
    ipAddress: getClientIpFromHeaders(request.headers),
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
