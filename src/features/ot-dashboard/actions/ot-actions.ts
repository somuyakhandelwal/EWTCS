'use server'

import pool from '@/shared/lib/db'
import { requireWriteRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import type { OTRoom, OTGridData } from '../types/ot'
import { runProcedureTransition } from '../lib/ot-procedure-mutations'

function getOTUpdateError(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error.code === '42703' || error.code === '23502' || error.code === '42P08')
  ) {
    return 'OT procedure schema is out of date. Run database migrations and try again.'
  }

  return 'Failed to update room status'
}

export async function getOTRooms(): Promise<{ success: boolean; data?: OTGridData; error?: string }> {
  try {
    const result = await pool.query<{
      id: string
      room_number: string
      status: 'available' | 'ongoing'
      started_at: Date | null
      active_procedure_name: string | null
      updated_at: Date
    }>(
      `SELECT
          r.id,
          r.room_number,
          r.status,
          r.started_at,
          r.updated_at,
          p.procedure_name AS active_procedure_name
       FROM ot_rooms r
       LEFT JOIN ot_procedures p
         ON p.ot_id = r.id
        AND p.status = 'IN_PROGRESS'
       ORDER BY room_number ASC`
    )

    const rooms: OTRoom[] = result.rows.map(r => ({
      id: r.id,
      roomNumber: r.room_number,
      status: r.status,
      startedAt: r.started_at,
      activeProcedureName: r.active_procedure_name,
      updatedAt: r.updated_at,
    }))

    return {
      success: true,
      data: {
        rooms,
        availableCount: rooms.filter(r => r.status === 'available').length,
        ongoingCount: rooms.filter(r => r.status === 'ongoing').length,
      },
    }
  } catch (error) {
    logger.error('Failed to fetch OT rooms', error as Error)
    return { success: false, error: 'Failed to load OT rooms' }
  }
}

export async function updateOTRoomStatus(input: {
  roomId: string
  status: 'available' | 'ongoing'
  procedureName?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireWriteRole(['nurse', 'supervisor', 'admin'], {
      actionType: 'UPDATE',
      entityType: 'ot_room',
      entityId: input.roomId,
    })

    const client = await pool.connect()
    let auditsToWrite: Parameters<typeof logAudit>[0][] = []
    try {
      await client.query('BEGIN')

      const transitionResult = await runProcedureTransition(client, input, {
        userId: session.userId,
      })
      if (!transitionResult.success) {
        await client.query('ROLLBACK')
        return transitionResult
      }
      auditsToWrite = transitionResult.audits

      await client.query(
        `UPDATE ot_rooms
         SET status = $1::ot_room_status,
             started_at = CASE WHEN $1::ot_room_status = 'ongoing'::ot_room_status THEN NOW() ELSE NULL END,
             updated_by = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [input.status, session.userId, input.roomId]
      )

      await client.query('COMMIT')
    } catch (txError) {
      await client.query('ROLLBACK')
      throw txError
    } finally {
      client.release()
    }

    for (const audit of auditsToWrite) {
      await logAudit(audit)
    }

    logger.info('OT room status updated', {
      roomId: input.roomId,
      status: input.status,
      updatedBy: session.userId,
      procedureName: input.procedureName || null,
    })

    return { success: true }
  } catch (error) {
    logger.error('Failed to update OT room status', error as Error)
    return { success: false, error: getOTUpdateError(error) }
  }
}
