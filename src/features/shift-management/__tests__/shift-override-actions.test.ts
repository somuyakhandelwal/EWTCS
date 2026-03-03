// Tests for US-8.2 AC-4 — Supervisor Shift Override Server Action
// Covers: overrideLogShift — success, role guard, audit trail, error handling
// Epic 8: Shift Management

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/shared/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/shared/lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('@/shared/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { query } from '@/shared/lib/db'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { revalidatePath } from 'next/cache'
import { overrideLogShift } from '../actions/shift-override-actions'

const LOG_ID   = 'log-uuid-0000-0000-0000-000000000001'
const SHIFT_ID = 'shift-uuid-0000-0000-0000-000000000002'
const USER_ID  = 'user-uuid-0000-0000-0000-000000000003'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('overrideLogShift', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Happy path ──────────────────────────────────────────────────────────

  it('updates shift_id and shift_override_by_user_id on success (supervisor)', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: USER_ID, role: 'supervisor' } as never)
    vi.mocked(query).mockResolvedValue({ rowCount: 1 } as never)
    vi.mocked(logAudit).mockResolvedValue(undefined)

    const result = await overrideLogShift({ logId: LOG_ID, shiftId: SHIFT_ID })

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()

    // Verify the UPDATE was called with the right parameters
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE bed_stage_logs'),
      [SHIFT_ID, USER_ID, LOG_ID]
    )
  })

  it('updates shift_id on success (admin)', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: USER_ID, role: 'admin' } as never)
    vi.mocked(query).mockResolvedValue({ rowCount: 1 } as never)
    vi.mocked(logAudit).mockResolvedValue(undefined)

    const result = await overrideLogShift({ logId: LOG_ID, shiftId: SHIFT_ID })

    expect(result.success).toBe(true)
  })

  // ── Audit trail ─────────────────────────────────────────────────────────

  it('logs an audit entry with the correct metadata', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: USER_ID, role: 'supervisor' } as never)
    vi.mocked(query).mockResolvedValue({ rowCount: 1 } as never)
    vi.mocked(logAudit).mockResolvedValue(undefined)

    await overrideLogShift({ logId: LOG_ID, shiftId: SHIFT_ID })

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'UPDATE',
        entityType: 'bed_stage_log_shift',
        entityId: LOG_ID,
        performedBy: USER_ID,
        changes: expect.objectContaining({ shiftId: SHIFT_ID }),
      })
    )
  })

  it('revalidates /dashboard after a successful override', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: USER_ID, role: 'supervisor' } as never)
    vi.mocked(query).mockResolvedValue({ rowCount: 1 } as never)
    vi.mocked(logAudit).mockResolvedValue(undefined)

    await overrideLogShift({ logId: LOG_ID, shiftId: SHIFT_ID })

    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
  })

  // ── Role guard ──────────────────────────────────────────────────────────

  it('returns error when role check fails (nurse / auditor)', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Forbidden: insufficient role'))

    const result = await overrideLogShift({ logId: LOG_ID, shiftId: SHIFT_ID })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to override shift')
    expect(query).not.toHaveBeenCalled()
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('passes the correct roles to requireRole', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: USER_ID, role: 'supervisor' } as never)
    vi.mocked(query).mockResolvedValue({ rowCount: 1 } as never)
    vi.mocked(logAudit).mockResolvedValue(undefined)

    await overrideLogShift({ logId: LOG_ID, shiftId: SHIFT_ID })

    expect(requireRole).toHaveBeenCalledWith(['supervisor', 'admin'])
  })

  // ── Error handling ──────────────────────────────────────────────────────

  it('returns error when DB update throws', async () => {
    vi.mocked(requireRole).mockResolvedValue({ userId: USER_ID, role: 'supervisor' } as never)
    vi.mocked(query).mockRejectedValue(new Error('Connection timeout'))

    const result = await overrideLogShift({ logId: LOG_ID, shiftId: SHIFT_ID })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to override shift')
    expect(logAudit).not.toHaveBeenCalled()
  })
})
