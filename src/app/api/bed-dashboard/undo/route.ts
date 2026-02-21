import { NextRequest, NextResponse } from 'next/server'
import { undoLastBedStageUpdate } from '@/features/bed-dashboard/actions/undo-actions'
import { verifySession } from '@/shared/lib/session'

export async function POST(req: NextRequest) {
  // HTTP-layer auth: /api/* paths are not covered by middleware.ts
  // Defense-in-depth: reject unauthenticated requests before parsing the body.
  // The action (undoLastBedStageUpdate) enforces role-based auth as a second layer.
  const session = await verifySession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { bedId } = await req.json()
    if (!bedId) {
      return NextResponse.json({ success: false, error: 'Missing bedId' }, { status: 400 })
    }

    const result = await undoLastBedStageUpdate({ bedId })
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}