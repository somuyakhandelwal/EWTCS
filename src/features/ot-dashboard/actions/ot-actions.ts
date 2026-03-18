'use server'

// OT Dashboard Actions
// EPIC 23: Operation Theatre (OT) Tracking Module (US-23.1)

import pool from '@/shared/lib/db'
import { requireWriteRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import type { OTRoom, OTGridData } from '../types/ot'

/** Fetch all 16 OT rooms with current status */
export async function getOTRooms(): Promise<{ success: boolean; data?: OTGridData; error?: string }> {
  try {
    const result = await pool.query<{
      id: string
      room_number: string
      status: 'available' | 'ongoing'
      started_at: Date | null
      updated_at: Date
    }>(
      `SELECT id, room_number, status, started_at, updated_at
       FROM ot_rooms
       ORDER BY room_number ASC`
    )

    const rooms: OTRoom[] = result.rows.map(r => ({
      id: r.id,
      roomNumber: r.room_number,
      status: r.status,
      startedAt: r.started_at,
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

/** Update OT room status (Ongoing / Available) */
export async function updateOTRoomStatus(input: {
  roomId: string
  status: 'available' | 'ongoing'
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireWriteRole(['nurse', 'supervisor', 'admin'], {
      actionType: 'UPDATE',
      entityType: 'ot_room',
      entityId: input.roomId,
    })

    await pool.query(
      `UPDATE ot_rooms
       SET status     = $1,
           started_at = CASE WHEN $1 = 'ongoing' THEN NOW() ELSE NULL END,
           updated_by = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [input.status, session.userId, input.roomId]
    )

    logger.info('OT room status updated', {
      roomId: input.roomId,
      status: input.status,
      updatedBy: session.userId,
    })

    return { success: true }
  } catch (error) {
    logger.error('Failed to update OT room status', error as Error)
    return { success: false, error: 'Failed to update room status' }
  }
}
