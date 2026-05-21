import { NextRequest, NextResponse } from 'next/server'
import { verifyActiveSession } from '@/shared/lib/active-session'
import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import {
  enqueueSchema,
  updateSchema,
  type QueueRow,
  isOperationalRole,
  MONITOR_SELECT_SQL,
} from './route-helpers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await verifyActiveSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isOperationalRole(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = enqueueSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid payload' },
        { status: 400 }
      )
    }

    const enqueuedAt = parsed.data.enqueuedAt ? new Date(parsed.data.enqueuedAt) : new Date()

    const result = await pool.query<{ id: string }>(
      `INSERT INTO offline_queue (user_id, client_operation_id, operation_type, payload, enqueued_at)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       ON CONFLICT (user_id, client_operation_id)
       DO UPDATE SET
         operation_type = EXCLUDED.operation_type,
         payload = EXCLUDED.payload,
         enqueued_at = LEAST(offline_queue.enqueued_at, EXCLUDED.enqueued_at)
       RETURNING id`,
      [
        session.userId,
        parsed.data.clientOperationId,
        parsed.data.operationType,
        JSON.stringify(parsed.data.payload),
        enqueuedAt,
      ]
    )

    return NextResponse.json(
      {
        success: true,
        id: result.rows[0].id,
        clientOperationId: parsed.data.clientOperationId,
        localId: parsed.data.localId ?? null,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('POST /api/offline-queue failed', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyActiveSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode')
    const rawLimit = Number(searchParams.get('limit') ?? '200')
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 200

    if (mode === 'monitor') {
      if (!['supervisor', 'admin'].includes(session.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      let wardId: string | null = null
      if (session.role === 'supervisor') {
        const wardResult = await pool.query<{ ward_id: string | null }>(
          'SELECT ward_id FROM users WHERE id = $1',
          [session.userId]
        )
        wardId = wardResult.rows[0]?.ward_id ?? null
      }

      const rows = await pool.query(MONITOR_SELECT_SQL, [wardId, limit])

      return NextResponse.json({ success: true, entries: rows.rows })
    }

    if (!isOperationalRole(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await pool.query<QueueRow>(
      `SELECT id, client_operation_id, operation_type, payload, enqueued_at, drained_at, failed_at, error_message
       FROM offline_queue
       WHERE user_id = $1
         AND drained_at IS NULL
       ORDER BY enqueued_at ASC
       LIMIT $2`,
      [session.userId, limit]
    )

    return NextResponse.json({ success: true, entries: result.rows })
  } catch (error) {
    logger.error('GET /api/offline-queue failed', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifyActiveSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isOperationalRole(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid payload' },
        { status: 400 }
      )
    }

    const isPrivileged = session.role === 'admin' || session.role === 'supervisor'
    const sql = parsed.data.status === 'drained'
      ? `UPDATE offline_queue
           SET drained_at = NOW(), failed_at = NULL, error_message = NULL
         WHERE id = $1
           AND ($2::boolean OR user_id = $3)
         RETURNING id`
      : `UPDATE offline_queue
           SET failed_at = NOW(), error_message = $4
         WHERE id = $1
           AND drained_at IS NULL
           AND ($2::boolean OR user_id = $3)
         RETURNING id`

    const result = await pool.query<{ id: string }>(sql, [
      parsed.data.id,
      isPrivileged,
      session.userId,
      parsed.data.errorMessage ?? 'Drain failed',
    ])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: result.rows[0].id })
  } catch (error) {
    logger.error('PATCH /api/offline-queue failed', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
