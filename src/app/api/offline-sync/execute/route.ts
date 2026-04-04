import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/shared/config/logger'
import { updateBedStage } from '@/features/bed-dashboard/actions/bed-actions'
import { dischargeAndResetBed } from '@/features/bed-dashboard/actions/discharge-actions'
import { recordDispositionDelayReason } from '@/features/bed-dashboard/actions/disposition-actions'
import type { DispositionDelayReason } from '@/features/bed-dashboard/types/bed'

type StageUpdatePayload = {
  type: 'stage-update'
  bedId: string
  stageId: string
  expectedStageId?: string
  options?: { supervisorOverride?: boolean; overrideReason?: string }
}

type DischargePayload = {
  type: 'discharge'
  bedId: string
}

type DispositionReasonPayload = {
  type: 'disposition-reason'
  bedId: string
  reason: DispositionDelayReason
}

type ExecuteOfflinePayload = StageUpdatePayload | DischargePayload | DispositionReasonPayload

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as ExecuteOfflinePayload

    if (!payload?.type || !payload?.bedId) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    if (payload.type === 'stage-update') {
      if (!payload.stageId) {
        return NextResponse.json({ success: false, error: 'stageId is required' }, { status: 400 })
      }

      const result = await updateBedStage({
        bedId: payload.bedId,
        toStageId: payload.stageId,
        expectedStageId: payload.expectedStageId,
        supervisorOverride: payload.options?.supervisorOverride ?? false,
        overrideReason: payload.options?.overrideReason,
      })

      if (result.conflict && result.serverStageId !== undefined) {
        // Latest-write-wins for offline replay:
        // if expected stage mismatched, retry without expectedStageId so the
        // user's newest queued intent is applied to current server state.
        const forceResult = await updateBedStage({
          bedId: payload.bedId,
          toStageId: payload.stageId,
          supervisorOverride: payload.options?.supervisorOverride ?? true,
          overrideReason: payload.options?.overrideReason || 'Auto-applied latest offline update after conflict',
        })

        const alreadyApplied =
          typeof forceResult.error === 'string' &&
          forceResult.error.toLowerCase().includes('already in the selected stage')

        if (alreadyApplied) {
          return NextResponse.json({ success: true })
        }

        return NextResponse.json({ success: Boolean(forceResult.success), error: forceResult.error })
      }

      const alreadyApplied =
        typeof result.error === 'string' &&
        result.error.toLowerCase().includes('already in the selected stage')

      if (alreadyApplied) {
        return NextResponse.json({ success: true })
      }

      return NextResponse.json({ success: Boolean(result.success), error: result.error })
    }

    if (payload.type === 'discharge') {
      const result = await dischargeAndResetBed({ bedId: payload.bedId })
      return NextResponse.json({ success: Boolean(result.success), error: result.error })
    }

    if (!payload.reason) {
      return NextResponse.json({ success: false, error: 'reason is required' }, { status: 400 })
    }

    const result = await recordDispositionDelayReason({
      bedId: payload.bedId,
      reason: payload.reason,
    })
    return NextResponse.json({ success: Boolean(result.success), error: result.error })
  } catch (error) {
    logger.error('POST /api/offline-sync/execute failed', error as Error)
    return NextResponse.json({ success: false, error: 'Failed to execute offline operation' }, { status: 500 })
  }
}
