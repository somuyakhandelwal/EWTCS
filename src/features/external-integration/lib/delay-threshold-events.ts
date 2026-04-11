import 'server-only'

import crypto from 'crypto'
import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { getGlobalEscalationThresholdMs, getGlobalThresholdMs } from '@/shared/lib/threshold'
import { getBedsWithElapsedTime } from '@/features/bed-dashboard/lib/bed-queries'
import { queueWebhookEvent } from './webhook-dispatcher'
import type { BedDelayThresholdExceededPayload } from '../types/webhook.types'

type DelayStateRow = {
  bed_id: string
  last_stage_id: string | null
  last_delayed: boolean
}

async function getExistingDelayStateMap(): Promise<Map<string, DelayStateRow>> {
  const rows = await query<DelayStateRow>(
    `SELECT bed_id, last_stage_id, last_delayed FROM webhook_delay_event_state`
  )
  return new Map(rows.rows.map((row) => [row.bed_id, row]))
}

async function upsertDelayState(args: {
  bedId: string
  stageId: string | null
  isDelayed: boolean
  thresholdMs: number
  emittedNow: boolean
}): Promise<void> {
  await query(
    `
      INSERT INTO webhook_delay_event_state (
        bed_id,
        last_stage_id,
        last_delayed,
        last_threshold_ms,
        last_emitted_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, CASE WHEN $5 THEN NOW() ELSE NULL END, NOW())
      ON CONFLICT (bed_id)
      DO UPDATE SET
        last_stage_id = EXCLUDED.last_stage_id,
        last_delayed = EXCLUDED.last_delayed,
        last_threshold_ms = EXCLUDED.last_threshold_ms,
        last_emitted_at = CASE
          WHEN $5 THEN NOW()
          ELSE webhook_delay_event_state.last_emitted_at
        END,
        updated_at = NOW()
    `,
    [args.bedId, args.stageId, args.isDelayed, args.thresholdMs, args.emittedNow]
  )
}

export async function queueDelayThresholdExceededEvents(): Promise<number> {
  const [delayThresholdMs, escalationThresholdMs] = await Promise.all([
    getGlobalThresholdMs(),
    getGlobalEscalationThresholdMs(),
  ])

  const [beds, stateMap] = await Promise.all([
    getBedsWithElapsedTime(delayThresholdMs, escalationThresholdMs),
    getExistingDelayStateMap(),
  ])

  let queuedEvents = 0

  for (const bed of beds) {
    const previous = stateMap.get(bed.id)
    const enteredDelayedState =
      bed.isDelayed &&
      (!previous || !previous.last_delayed || previous.last_stage_id !== bed.currentStageId)

    if (enteredDelayedState) {
      const payload: BedDelayThresholdExceededPayload = {
        eventId: crypto.randomUUID(),
        eventType: 'bed.delay.threshold.exceeded',
        occurredAt: new Date().toISOString(),
        source: 'ewtcs',
        version: '1.0',
        bedId: bed.id,
        bedNumber: bed.bedNumber,
        currentStageId: bed.currentStageId,
        elapsedTimeMs: bed.elapsedTimeMs ?? 0,
        thresholdMs: delayThresholdMs,
      }

      try {
        queuedEvents += await queueWebhookEvent(payload)
      } catch (error) {
        logger.warn('Failed to queue delay threshold webhook event', {
          bedId: bed.id,
          bedNumber: bed.bedNumber,
          error: error instanceof Error ? error.message : 'Unknown queueing error',
        })
      }
    }

    await upsertDelayState({
      bedId: bed.id,
      stageId: bed.currentStageId,
      isDelayed: bed.isDelayed,
      thresholdMs: delayThresholdMs,
      emittedNow: enteredDelayedState,
    })
  }

  return queuedEvents
}
