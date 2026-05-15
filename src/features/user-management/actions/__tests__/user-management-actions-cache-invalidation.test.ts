import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockRequireAdminWrite,
  mockDeactivateUserInDB,
  mockLogUserAction,
  mockInvalidateActiveUserCache,
} = vi.hoisted(() => ({
  mockRequireAdminWrite: vi.fn(),
  mockDeactivateUserInDB: vi.fn(),
  mockLogUserAction: vi.fn(),
  mockInvalidateActiveUserCache: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/shared/lib/active-session', () => ({
  invalidateActiveUserCache: mockInvalidateActiveUserCache,
}))

vi.mock('@/features/user-management/schemas/user-schemas', () => ({
  createUserSchema: { safeParse: vi.fn() },
  updateUserSchema: { safeParse: vi.fn() },
  deactivateUserSchema: {
    safeParse: vi.fn(() => ({ success: true, data: { userId: 'user-1' } })),
  },
}))

vi.mock('@/features/user-management/lib/auth', () => ({
  requireAdminWrite: mockRequireAdminWrite,
}))

vi.mock('@/features/user-management/lib/audit', () => ({
  logUserAction: mockLogUserAction,
}))

vi.mock('@/features/user-management/lib/queries', () => ({
  getAllUsers: vi.fn(),
  getUserLogs: vi.fn(),
}))

vi.mock('@/features/user-management/lib/mutations', () => ({
  createUserInDB: vi.fn(),
  updateUserInDB: vi.fn(),
  deactivateUserInDB: mockDeactivateUserInDB,
  activateUserInDB: vi.fn(),
}))

import { deactivateUser } from '@/features/user-management/actions/user-management-actions'

describe('deactivateUser cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminWrite.mockResolvedValue({ userId: 'admin-1' })
    mockDeactivateUserInDB.mockResolvedValue(undefined)
    mockLogUserAction.mockResolvedValue(undefined)
  })

  it('invalidates active-user cache immediately after deactivation', async () => {
    const result = await deactivateUser('user-1', 'deactivated in admin panel')

    expect(result.success).toBe(true)
    expect(mockDeactivateUserInDB).toHaveBeenCalledWith('user-1')
    expect(mockInvalidateActiveUserCache).toHaveBeenCalledWith('user-1')
    expect(mockInvalidateActiveUserCache).toHaveBeenCalledTimes(1)
  })
})
