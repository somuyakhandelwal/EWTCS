import type { PoolClient } from 'pg'
import type { AuditLogEntry } from '@/shared/lib/audit'
import { OTProcedureStartSchema, OTProcedureFinishSchema } from '../schemas/ot-procedure-schema'

type TransitionSuccess = {
  success: true
  audits: AuditLogEntry[]
}

type TransitionFailure = {
  success: false
  error: string
}

export async function runProcedureTransition(
  client: PoolClient,
  input: {
    roomId: string
    status: 'available' | 'ongoing'
    procedureName?: string
  },
  session: { userId: string }
): Promise<TransitionSuccess | TransitionFailure> {
  if (input.status === 'ongoing') {
    const parsed = OTProcedureStartSchema.safeParse({
      roomId: input.roomId,
      procedureName: input.procedureName,
    })

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid procedure details',
      }
    }

    const activeProcedureCheck = await client.query<{ id: string }>(
      `SELECT id
       FROM ot_procedures
       WHERE ot_id = $1 AND status = 'IN_PROGRESS'
       LIMIT 1`,
      [input.roomId]
    )

    if (activeProcedureCheck.rows.length > 0) {
      return {
        success: false,
        error: 'This OT room already has an active procedure',
      }
    }

    await client.query(
      `INSERT INTO ot_procedures (
         ot_id,
         procedure_name,
         surgeon_id,
         actual_start_time,
         status
       )
       VALUES ($1, $2, $3, NOW(), 'IN_PROGRESS')`,
      [input.roomId, parsed.data.procedureName, null]
    )

    return {
      success: true,
      audits: [
        {
          actionType: 'OT_PROCEDURE_START',
          entityType: 'ot_procedure',
          entityId: input.roomId,
          performedBy: session.userId,
          metadata: {
            roomId: input.roomId,
            procedureName: parsed.data.procedureName,
          },
        },
      ],
    }
  }

  const parsed = OTProcedureFinishSchema.safeParse({ roomId: input.roomId })
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid room id',
    }
  }

  const activeProcedure = await client.query<{
    id: string
    actual_start_time: Date
  }>(
    `SELECT id, actual_start_time
     FROM ot_procedures
     WHERE ot_id = $1 AND status = 'IN_PROGRESS'
     ORDER BY actual_start_time DESC
     LIMIT 1`,
    [input.roomId]
  )

  if (activeProcedure.rows.length === 0) {
    const roomResult = await client.query<{ status: 'available' | 'ongoing' }>(
      `SELECT status
       FROM ot_rooms
       WHERE id = $1
       FOR UPDATE`,
      [input.roomId]
    )

    if (roomResult.rows[0]?.status === 'ongoing') {
      return {
        success: true,
        audits: [
          {
            actionType: 'OT_ROOM_RECOVERY',
            entityType: 'ot_room',
            entityId: input.roomId,
            performedBy: session.userId,
            reason: 'Recovered stale ongoing OT room without active procedure row',
            metadata: {
              roomId: input.roomId,
              recoveryType: 'stale_ongoing_without_active_procedure',
            },
          },
        ],
      }
    }

    return {
      success: false,
      error: 'No active procedure found for this OT room',
    }
  }

  await client.query(
    `UPDATE ot_procedures
     SET
       actual_finish_time = NOW(),
       duration_minutes = GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (NOW() - actual_start_time)) / 60)::INTEGER),
       status = 'COMPLETED',
       updated_at = NOW()
     WHERE id = $1`,
    [activeProcedure.rows[0].id]
  )

  return {
    success: true,
    audits: [
      {
        actionType: 'OT_PROCEDURE_FINISH',
        entityType: 'ot_procedure',
        entityId: activeProcedure.rows[0].id,
        performedBy: session.userId,
        metadata: {
          roomId: input.roomId,
        },
      },
    ],
  }
}
