import { NextRequest, NextResponse } from 'next/server'
import { verifyActiveSession } from '@/shared/lib/active-session'
import {
  getErrorSummary,
  getRecentErrors,
  acknowledgeError,
} from '@/lib/server/error-store'

export const dynamic = 'force-dynamic'

// GET /api/monitoring/errors — error summary + recent events (admin only)
// Query params: ?limit=50&level=ERROR&unacked=true
export async function GET(req: NextRequest) {
  const session = await verifyActiveSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const limit  = Math.min(200, parseInt(searchParams.get('limit') || '50', 10))
  const level  = searchParams.get('level')?.toUpperCase() || null
  const unacked = searchParams.get('unacked') === 'true'

  try {
    const [summary, allRecent] = await Promise.all([
      getErrorSummary(),
      getRecentErrors(limit),
    ])

    const recent = allRecent
      .filter(e => !level  || e.level === level)
      .filter(e => !unacked || !e.acknowledged)

    return NextResponse.json({ summary, recent })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to load error events', detail: (err as Error).message },
      { status: 500 },
    )
  }
}

// PATCH /api/monitoring/errors — acknowledge an error event (admin only)
// Body: { id: string }
export async function PATCH(req: NextRequest) {
  const session = await verifyActiveSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let id: string
  try {
    const body = await req.json()
    id = body?.id
    if (!id || typeof id !== 'string') throw new Error('missing id')
  } catch {
    return NextResponse.json({ error: 'Body must contain { id: string }' }, { status: 400 })
  }

  try {
    const updated = await acknowledgeError(id)
    if (!updated) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    return NextResponse.json({ acknowledged: true, id })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to acknowledge', detail: (err as Error).message },
      { status: 500 },
    )
  }
}
