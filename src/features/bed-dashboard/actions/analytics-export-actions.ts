'use server'

// Analytics Export Actions
// Purpose: Server actions for exporting analytics data as CSV
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import {
  getStageTransitions,
  type StageTransitionRecord,
} from '../lib/stage-analytics'

const CSV_HEADERS = [
  'ID',
  'Bed Number',
  'From Stage',
  'To Stage',
  'Transition Time',
  'Duration in Previous Stage (ms)',
  'Duration in Current Stage (ms)',
  'Changed By',
  'Notes',
]

function transitionToRow(t: StageTransitionRecord): string[] {
  return [
    t.id,
    t.bedNumber,
    t.fromStageName || 'N/A',
    t.toStageName,
    t.transitionTime.toISOString(),
    t.durationInPreviousStageMs?.toString() || 'N/A',
    t.durationInCurrentStageMs?.toString() || 'N/A',
    t.changedByUsername,
    t.notes || '',
  ]
}

/**
 * Export stage transitions as CSV for external analysis.
 * Supervisors, admins, and auditors only.
 */
export async function exportStageTransitionsAsCSV(options?: {
  startDate?: Date
  endDate?: Date
  bedId?: string
  stageId?: string
}): Promise<{
  success: boolean
  data?: string
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin', 'auditor'])

    const transitions = await getStageTransitions(
      options?.startDate,
      options?.endDate,
      options?.bedId,
      options?.stageId
    )

    const csv = [CSV_HEADERS, ...transitions.map(transitionToRow)]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')

    logger.info('Exported stage transitions as CSV', {
      userId: session.userId,
      count: transitions.length,
    })

    return { success: true, data: csv }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export data'
    logger.error('Failed to export stage transitions', error as Error)
    return { success: false, error: message }
  }
}
