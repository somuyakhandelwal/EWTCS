import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/shared/config/logger'
import { updateBedStage } from '@/features/bed-dashboard/actions/bed-actions'

export const dynamic = 'force-dynamic'

type StageUpdatePayload = {
  bedId: string
  toStageId: string
  supervisorOverride?: boolean
  overrideReason?: string
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as StageUpdatePayload
    if (!payload?.bedId || !payload?.toStageId) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    const result = await updateBedStage({
      ...payload,
      supervisorOverride: payload.supervisorOverride ?? false,
    })
    return NextResponse.json(result)
  } catch (error) {
    logger.error('POST /api/bed-stage/update failed', error as Error)
    return NextResponse.json({ success: false, error: 'Failed to update bed stage' }, { status: 500 })
  }
}
