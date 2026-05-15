'use server'

import { headers } from 'next/headers'
import { logAudit } from '@/shared/lib/audit'
import { getCurrentSession } from '@/shared/lib/auth'
import { getClientIpFromHeaders } from '@/shared/lib/request-ip'
import { logger } from '@/shared/config/logger'

export async function logRecoveryEventAction(
  event: string,
  context?: Record<string, unknown>
): Promise<void> {
  try {
    const session = await getCurrentSession()
    if (!session) return

    const requestHeaders = await headers()
    const ipAddress = getClientIpFromHeaders(requestHeaders)

    await logAudit({
      actionType: 'RECOVERY_EVENT',
      entityType: 'recovery',
      entityId: event,
      performedBy: session.userId,
      changes: {},
      metadata: {
        event,
        context: context ?? {},
      },
      ipAddress,
    })
  } catch (error) {
    logger.warn('Failed to persist recovery event audit log', {
      event,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}