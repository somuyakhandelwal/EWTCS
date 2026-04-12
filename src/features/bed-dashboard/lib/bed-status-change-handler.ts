import { logger } from '@/shared/config/logger'
import { dispatchDueWebhooks, queueWebhookEvent } from '@/features/external-integration/lib/webhook-dispatcher'
import type { BedStatusChangedPayload } from '@/features/external-integration/types/webhook.types'
import crypto from 'crypto'
import type { Bed } from '@/features/bed-dashboard/types/bed-types'

export async function handleBedStatusChange(
  bed: Bed,
  toStageId: string,
  userId: string
): Promise<void> {
  if (bed.currentStageId === toStageId) {
    return
  }

  const webhookPayload: BedStatusChangedPayload = {
    eventId: crypto.randomUUID(),
    eventType: 'bed.status.changed',
    occurredAt: new Date().toISOString(),
    source: 'ewtcs',
    version: '1.0',
    bedId: bed.id,
    bedNumber: bed.bedNumber,
    fromStageId: bed.currentStageId,
    toStageId: toStageId,
    changedByUserId: userId,
  }

  try {
    await queueWebhookEvent(webhookPayload)
    void dispatchDueWebhooks(5).catch((dispatchError) => {
      logger.warn('Webhook dispatch failed after bed status change', {
        bedId: bed.id,
        error: dispatchError instanceof Error ? dispatchError.message : 'Unknown webhook dispatch error',
      })
    })
  } catch (webhookError) {
    logger.warn('Webhook queueing failed for bed status change', {
      bedId: bed.id,
      error: webhookError instanceof Error ? webhookError.message : 'Unknown webhook queue error',
    })
  }
}
