'use server'

/**
 * EPIC 7: Error Handling & Correction — Write Actions
 * submitHistoryCorrection: inserts a correction record and writes to audit log.
 * Split from read actions to keep each file under 200 lines.
 */

import { requireWriteRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import {
  insertHistoryCorrection,
  fetchBedStageLogOriginal,
} from '../lib/stage-history-correction-queries'

export interface CorrectedFieldsInput {
  notes?: string
  transition_time?: string
  to_stage_id?: string
}

export interface SubmitCorrectionPayload {
  bedStageLogId: string
  correctionReason: string
  correctedFields: CorrectedFieldsInput
}

type WriteResult =
  | { success: true; data: { correctionId: string } }
  | { success: false; error: string }

/**
 * Submit a supervisor correction for a single bed stage log entry.
 * AC 1 — gated behind supervisor/admin role
 * AC 2 — correctionReason is mandatory
 * AC 3 — original data fetched and diffed; bed_stage_logs never mutated
 * AC 4 — correctionId returned so UI marks the row as "Corrected"
 * AC 5 — logged with supervisor userId in corrections table + audit log
 */
export async function submitHistoryCorrection(payload: SubmitCorrectionPayload): Promise<WriteResult> {
  try {
    const session = await requireWriteRole(['supervisor', 'admin'], {
      entityType: 'bed_stage_log',
      entityId: payload.bedStageLogId,
    })

    if (!payload.correctionReason?.trim()) return { success: false, error: 'A correction reason is required.' }
    if (!payload.bedStageLogId?.trim())    return { success: false, error: 'Invalid log record ID.' }

    const hasField =
      payload.correctedFields.notes !== undefined ||
      payload.correctedFields.transition_time !== undefined ||
      payload.correctedFields.to_stage_id !== undefined
    if (!hasField) return { success: false, error: 'At least one field must be corrected.' }

    // AC 3: fetch original to build before/after diff
    const original = await fetchBedStageLogOriginal(payload.bedStageLogId)
    if (!original) return { success: false, error: 'Stage log record not found.' }

    const diff: Record<string, { from: unknown; to: unknown }> = {}

    if (payload.correctedFields.notes !== undefined && payload.correctedFields.notes !== original.notes) {
      diff.notes = { from: original.notes, to: payload.correctedFields.notes }
    }

    if (payload.correctedFields.transition_time !== undefined) {
      const newTime  = new Date(payload.correctedFields.transition_time)
      const origTime = new Date(original.transitionTime)
      if (!isNaN(newTime.getTime()) && newTime.toISOString() !== origTime.toISOString()) {
        diff.transition_time = { from: origTime.toISOString(), to: newTime.toISOString() }
      }
    }

    if (
      payload.correctedFields.to_stage_id !== undefined &&
      payload.correctedFields.to_stage_id !== original.toStageId
    ) {
      diff.to_stage_id = {
        from: { id: original.toStageId, name: original.toStageName },
        to:   { id: payload.correctedFields.to_stage_id },
      }
    }

    if (Object.keys(diff).length === 0) {
      return { success: false, error: 'No fields were changed from their original values.' }
    }

    // AC 3 & 4: insert correction row — original bed_stage_logs row untouched
    const { id: correctionId } = await insertHistoryCorrection({
      bedStageLogId: payload.bedStageLogId,
      correctedByUserId: session.userId,
      correctionReason: payload.correctionReason.trim(),
      correctedFields: diff,
    })

    // AC 5: write to generic audit log with supervisor userId
    try {
      await logAudit({
        actionType: 'HISTORY_CORRECTION' as Parameters<typeof logAudit>[0]['actionType'],
        entityType: 'bed_stage_log',
        entityId: payload.bedStageLogId,
        performedBy: session.userId,
        reason: payload.correctionReason.trim(),
        metadata: { correctionId, supervisorId: session.userId, fieldsChanged: Object.keys(diff), diff },
      })
    } catch (auditError) {
      // Audit log failure must not roll back the correction
      logger.error('submitHistoryCorrection: audit log write failed', auditError as Error)
    }

    logger.info('Stage history correction submitted', {
      correctionId, bedStageLogId: payload.bedStageLogId,
      supervisorId: session.userId, fieldsChanged: Object.keys(diff),
    })

    return { success: true, data: { correctionId } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit correction'
    logger.error('submitHistoryCorrection failed', error as Error)
    return { success: false, error: message }
  }
}
