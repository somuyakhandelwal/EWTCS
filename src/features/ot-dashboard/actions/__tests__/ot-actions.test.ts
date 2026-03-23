import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({ requireWriteRole: vi.fn() }))
vi.mock('@/shared/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))
vi.mock('@/shared/lib/db', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))

import pool from '@/shared/lib/db'
import { requireWriteRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { getOTRooms, updateOTRoomStatus } from '@/features/ot-dashboard/actions/ot-actions'

const SESSION = { userId: 'nurse-1', role: 'nurse' }

describe('ot-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getOTRooms maps active procedure names', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [
        {
          id: 'room-1',
          room_number: 'OT-01',
          status: 'ongoing',
          started_at: new Date('2026-03-23T08:00:00.000Z'),
          active_procedure_name: 'Appendectomy',
          updated_at: new Date('2026-03-23T08:10:00.000Z'),
        },
      ],
    } as never)

    const result = await getOTRooms()

    expect(result.success).toBe(true)
    expect(result.data?.rooms[0]?.activeProcedureName).toBe('Appendectomy')
    expect(result.data?.ongoingCount).toBe(1)
  })

  it('updateOTRoomStatus starts procedure and updates room', async () => {
    vi.mocked(requireWriteRole).mockResolvedValueOnce(SESSION as never)

    const query = vi
      .fn()
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // active procedure check
      .mockResolvedValueOnce(undefined) // INSERT ot_procedures
      .mockResolvedValueOnce(undefined) // UPDATE ot_rooms
      .mockResolvedValueOnce(undefined) // COMMIT

    const release = vi.fn()
    vi.mocked(pool.connect).mockResolvedValueOnce({ query, release } as never)

    const result = await updateOTRoomStatus({
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'ongoing',
      procedureName: 'Laparoscopic Appendectomy',
    })

    expect(result.success).toBe(true)
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ot_procedures'),
      [
        '550e8400-e29b-41d4-a716-446655440000',
        'Laparoscopic Appendectomy',
        null,
      ]
    )
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'OT_PROCEDURE_START' })
    )
    expect(release).toHaveBeenCalled()
  })

  it('updateOTRoomStatus rejects start without procedure name', async () => {
    vi.mocked(requireWriteRole).mockResolvedValueOnce(SESSION as never)

    const query = vi
      .fn()
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // ROLLBACK

    const release = vi.fn()
    vi.mocked(pool.connect).mockResolvedValueOnce({ query, release } as never)

    const result = await updateOTRoomStatus({
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'ongoing',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/invalid input/i)
    expect(query).toHaveBeenCalledWith('ROLLBACK')
    expect(release).toHaveBeenCalled()
  })

  it('updateOTRoomStatus rejects finish when no active procedure exists', async () => {
    vi.mocked(requireWriteRole).mockResolvedValueOnce(SESSION as never)

    const query = vi
      .fn()
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // active procedure lookup
      .mockResolvedValueOnce(undefined) // ROLLBACK

    const release = vi.fn()
    vi.mocked(pool.connect).mockResolvedValueOnce({ query, release } as never)

    const result = await updateOTRoomStatus({
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'available',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/no active procedure/i)
    expect(query).toHaveBeenCalledWith('ROLLBACK')
    expect(release).toHaveBeenCalled()
  })

  it('updateOTRoomStatus finishes active procedure and updates room', async () => {
    vi.mocked(requireWriteRole).mockResolvedValueOnce(SESSION as never)

    const query = vi
      .fn()
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'proc-1',
            actual_start_time: new Date('2026-03-23T08:00:00.000Z'),
          },
        ],
      }) // active procedure lookup
      .mockResolvedValueOnce(undefined) // UPDATE ot_procedures
      .mockResolvedValueOnce(undefined) // UPDATE ot_rooms
      .mockResolvedValueOnce(undefined) // COMMIT

    const release = vi.fn()
    vi.mocked(pool.connect).mockResolvedValueOnce({ query, release } as never)

    const result = await updateOTRoomStatus({
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'available',
    })

    expect(result.success).toBe(true)
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('duration_minutes = GREATEST(1'),
      ['proc-1']
    )
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'OT_PROCEDURE_FINISH' })
    )
    expect(release).toHaveBeenCalled()
  })
})
