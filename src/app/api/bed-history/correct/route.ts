/**
 * EPIC 7: Error Handling & Correction
 * POST /api/bed-history/correct
 *
 * REST wrapper around submitHistoryCorrection.
 * The UI uses the server action directly; this route exists for
 * external tooling, integration tests, and future API consumers.
 * Follows the same auth + response shape as /api/bed-dashboard/undo/route.ts.
 *
 * Auth: supervisor or admin only (enforced inside submitHistoryCorrection).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/shared/lib/session'
import { submitHistoryCorrection } from '@/features/bed-dashboard/actions/stage-history-correction-write-actions'
import { logger } from '@/shared/config/logger'

export async function POST(req: NextRequest) {
  // Defense-in-depth: reject unauthenticated requests before parsing the body.
  // Role enforcement (supervisor/admin) happens inside submitHistoryCorrection.
  const session = await verifySession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { bedStageLogId, correctionReason, correctedFields } = body as {
      bedStageLogId?: unknown
      correctionReason?: unknown
      correctedFields?: unknown
    }

    if (typeof bedStageLogId !== 'string' || !bedStageLogId.trim()) {
      return NextResponse.json(
        { success: false, error: 'bedStageLogId is required.' },
        { status: 400 }
      )
    }

    if (typeof correctionReason !== 'string' || !correctionReason.trim()) {
      return NextResponse.json(
        { success: false, error: 'correctionReason is required.' },
        { status: 400 }
      )
    }

    if (typeof correctedFields !== 'object' || correctedFields === null || Array.isArray(correctedFields)) {
      return NextResponse.json(
        { success: false, error: 'correctedFields must be an object.' },
        { status: 400 }
      )
    }

    const result = await submitHistoryCorrection({
      bedStageLogId,
      correctionReason,
      correctedFields: correctedFields as { notes?: string; transition_time?: string },
    })

    if (result.success === false) {
      const isAuthError =
        result.error?.startsWith('Unauthorized') ||
        result.error?.startsWith('Read-only')
      return NextResponse.json(result, { status: isAuthError ? 403 : 422 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    logger.error('POST /api/bed-history/correct failed', error as Error)
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
