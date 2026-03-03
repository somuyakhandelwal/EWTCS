// Tests for US-8.1 — Shift CRUD Server Actions
// Covers: getShiftsAction, createShift, updateShift, deleteShift
// Epic 8: Shift Management

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/shared/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/shared/lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('@/shared/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('../lib/shift-queries', () => ({ getAllShifts: vi.fn() }))

import { query } from '@/shared/lib/db'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { getAllShifts } from '../lib/shift-queries'
import {
  getShiftsAction,
  createShift,
  updateShift,
  deleteShift,
} from '../actions/shift-actions'

// RFC 4122 v4 UUIDs (version nibble = 4, variant nibble = 8)
const SHIFT_ID = 'a1a2a3a4-b1b2-4c3c-8d4d-e5e6e7e8e9e0'
const USER_ID  = 'f0f1f2f3-1121-4222-8333-444546474849'

const MOCK_SHIFT = {
  id: SHIFT_ID,
  name: 'Morning',
  start_time: '06:00:00',
  end_time: '14:00:00',
  crosses_midnight: false,
  is_default: false,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const SESSION = { userId: USER_ID, role: 'admin' as const }

// ---------------------------------------------------------------------------
// getShiftsAction
// ---------------------------------------------------------------------------
describe('getShiftsAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns shifts on success', async () => {
    vi.mocked(getAllShifts).mockResolvedValue([MOCK_SHIFT])

    const result = await getShiftsAction()

    expect(result.success).toBe(true)
    expect(result.shifts).toHaveLength(1)
    expect(result.shifts![0].name).toBe('Morning')
  })

  it('returns error when DB throws', async () => {
    vi.mocked(getAllShifts).mockRejectedValue(new Error('DB down'))

    const result = await getShiftsAction()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to load shifts')
  })
})

// ---------------------------------------------------------------------------
// createShift
// ---------------------------------------------------------------------------
describe('createShift', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a shift and returns it on success', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(query).mockResolvedValue({ rows: [MOCK_SHIFT], rowCount: 1 } as never)
    vi.mocked(logAudit).mockResolvedValue(undefined)

    const result = await createShift({ name: 'Morning', start_time: '06:00', end_time: '14:00' })

    expect(result.success).toBe(true)
    expect(result.shift?.name).toBe('Morning')
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'CREATE', entityType: 'shift' })
    )
  })

  it('returns validation error when name is empty', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)

    const result = await createShift({ name: '', start_time: '06:00', end_time: '14:00' })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(query).not.toHaveBeenCalled()
  })

  it('returns validation error for invalid time format', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)

    const result = await createShift({ name: 'Test', start_time: 'bad', end_time: '14:00' })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/HH:MM/)
    expect(query).not.toHaveBeenCalled()
  })

  it('returns error when role check fails (non-admin)', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Forbidden'))

    const result = await createShift({ name: 'Test', start_time: '06:00', end_time: '14:00' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Forbidden')
  })

  it('returns error when DB insert fails', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(query).mockRejectedValue(new Error('Duplicate key'))

    const result = await createShift({ name: 'Morning', start_time: '06:00', end_time: '14:00' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Duplicate key')
  })
})

// ---------------------------------------------------------------------------
// updateShift
// ---------------------------------------------------------------------------
describe('updateShift', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates the shift and returns it on success', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(query).mockResolvedValue({ rows: [MOCK_SHIFT], rowCount: 1 } as never)
    vi.mocked(logAudit).mockResolvedValue(undefined)

    const result = await updateShift({ id: SHIFT_ID, name: 'Morning', is_active: true })

    expect(result.success).toBe(true)
    expect(result.shift?.id).toBe(SHIFT_ID)
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'UPDATE', entityType: 'shift', entityId: SHIFT_ID })
    )
  })

  it('returns error when shift is not found', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0 } as never)

    const result = await updateShift({ id: SHIFT_ID })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Shift not found')
  })

  it('returns validation error for invalid UUID', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)

    const result = await updateShift({ id: 'not-a-uuid' })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(query).not.toHaveBeenCalled()
  })

  it('returns validation error for invalid time format', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)

    const result = await updateShift({ id: SHIFT_ID, start_time: 'midnight' })

    expect(result.success).toBe(false)
    expect(query).not.toHaveBeenCalled()
  })

  it('returns error when DB throws', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(query).mockRejectedValue(new Error('Connection lost'))

    const result = await updateShift({ id: SHIFT_ID, name: 'Updated' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Connection lost')
  })
})

// ---------------------------------------------------------------------------
// deleteShift
// ---------------------------------------------------------------------------
describe('deleteShift', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deactivates a non-default shift successfully', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(query).mockResolvedValue({ rows: [{ id: SHIFT_ID }], rowCount: 1 } as never)
    vi.mocked(logAudit).mockResolvedValue(undefined)

    const result = await deleteShift(SHIFT_ID)

    expect(result.success).toBe(true)
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'DEACTIVATE', entityType: 'shift', entityId: SHIFT_ID })
    )
  })

  it('returns error when rowCount is 0 (default shift protection)', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    // rowCount === 0 means the WHERE is_default = FALSE guard blocked the row
    vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0 } as never)

    const result = await deleteShift(SHIFT_ID)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Default shifts cannot be deleted')
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('returns error when DB throws', async () => {
    vi.mocked(requireRole).mockResolvedValue(SESSION as never)
    vi.mocked(query).mockRejectedValue(new Error('DB error'))

    const result = await deleteShift(SHIFT_ID)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to delete shift')
  })

  it('returns error when role check fails', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Forbidden'))

    const result = await deleteShift(SHIFT_ID)

    expect(result.success).toBe(false)
  })
})
