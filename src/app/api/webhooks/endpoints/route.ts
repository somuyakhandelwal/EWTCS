import { NextRequest, NextResponse } from 'next/server'
import { verifyActiveSession } from '@/shared/lib/active-session'
import { logAudit } from '@/shared/lib/audit'
import { getClientIpFromHeaders } from '@/shared/lib/request-ip'
import {
  createWebhookEndpointSchema,
  updateWebhookEndpointSchema,
} from '@/features/external-integration/schemas/webhook-endpoint-schemas'
import {
  getWebhookEndpoints,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deactivateWebhookEndpoint,
} from '@/features/external-integration/lib/webhook-endpoint-queries'

async function requireAdminSession() {
  const session = await verifyActiveSession()
  if (!session || session.role !== 'admin') {
    return null
  }
  return session
}

export async function GET() {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const endpoints = await getWebhookEndpoints()
  return NextResponse.json({ success: true, data: endpoints })
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
  const id = await createWebhookEndpoint(data, session.userId)

  await logAudit({
    actionType: 'CREATE',
    entityType: 'webhook_endpoint',
    entityId: id,
    performedBy: session.userId,
    changes: {
      name: data.name,
      targetUrl: data.targetUrl,
      subscribedEvents: data.subscribedEvents,
    },
    metadata: { source: 'api/webhooks/endpoints' },
    ipAddress: getClientIpFromHeaders(request.headers),
  }).catch(() => {})

  return NextResponse.json({ success: true, id }, { status: 201 })
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
  const rowCount = await updateWebhookEndpoint(data, session.userId)

  if (rowCount === 0) {
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

  const rowCount = await deactivateWebhookEndpoint(id, session.userId)

  if (rowCount === 0) {
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
