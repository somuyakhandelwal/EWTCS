import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/active-session', () => ({
  verifyActiveSession: vi.fn(),
}))

vi.mock('@/shared/lib/audit', () => ({
  logAudit: vi.fn(),
}))

vi.mock('@/shared/lib/auth-policy', () => ({
  hasPermission: vi.fn(),
  logPolicyViolation: vi.fn(),
}))

import { verifyActiveSession } from '@/shared/lib/active-session'
import { logAudit } from '@/shared/lib/audit'
import { hasPermission, logPolicyViolation } from '@/shared/lib/auth-policy'
import { requireAdminWrite, requireWriteRole, requireReadRole, requireDeleteRole, checkPolicyGuard } from '@/shared/lib/auth'

describe('shared auth write guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows write action for non-read-only allowed role', async () => {
    vi.mocked(verifyActiveSession).mockResolvedValue({
      userId: 'u-1',
      username: 'nurse1',
      role: 'nurse',
    } as never)

    const session = await requireWriteRole(['nurse', 'supervisor', 'admin'], {
      actionType: 'UPDATE',
      entityType: 'bed',
      entityId: 'bed-1',
    })

    expect(session.userId).toBe('u-1')
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('denies auditor write action and logs denial', async () => {
    vi.mocked(verifyActiveSession).mockResolvedValue({
      userId: 'auditor-1',
      username: 'auditor1',
      role: 'auditor',
    } as never)

    await expect(
      requireWriteRole(['nurse', 'supervisor', 'admin'], {
        actionType: 'UPDATE',
        entityType: 'bed',
        entityId: 'bed-99',
      })
    ).rejects.toThrow('Read-only mode: auditors cannot perform write actions')

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'UPDATE',
        entityType: 'bed',
        entityId: 'bed-99',
        performedBy: 'auditor-1',
      })
    )
  })

  it('denies unauthorized role without logging read-only denial', async () => {
    vi.mocked(verifyActiveSession).mockResolvedValue({
      userId: 'u-2',
      username: 'nurse1',
      role: 'nurse',
    } as never)

    await expect(requireWriteRole('admin')).rejects.toThrow('Unauthorized: Required role(s): admin')
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('requireAdminWrite allows admin and denies auditor', async () => {
    vi.mocked(verifyActiveSession).mockResolvedValueOnce({
      userId: 'admin-1',
      username: 'admin1',
      role: 'admin',
    } as never)

    await expect(
      requireAdminWrite({ actionType: 'ACTIVATE', entityType: 'user', entityId: 'user-1' })
    ).resolves.toMatchObject({ role: 'admin' })

    vi.mocked(verifyActiveSession).mockResolvedValueOnce({
      userId: 'auditor-2',
      username: 'auditor2',
      role: 'auditor',
    } as never)

    await expect(
      requireAdminWrite({ actionType: 'ACTIVATE', entityType: 'user', entityId: 'user-1' })
    ).rejects.toThrow('Read-only mode: auditors cannot perform write actions')
  })
})

describe('granular access policies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyActiveSession).mockResolvedValue({
      userId: 'u-1',
      username: 'nurse1',
      role: 'nurse',
    } as never)
  })

  it('allows read action when hasPermission is true', async () => {
    vi.mocked(hasPermission).mockReturnValue(true)
    const session = await requireReadRole('beds')
    expect(session.userId).toBe('u-1')
    expect(hasPermission).toHaveBeenCalledWith('nurse', 'beds', 'read')
  })

  it('denies read action and logs violation when hasPermission is false', async () => {
    vi.mocked(hasPermission).mockReturnValue(false)
    await expect(requireReadRole('beds')).rejects.toThrow('Forbidden: Role nurse cannot perform read on beds')
    expect(logPolicyViolation).toHaveBeenCalled()
  })

  it('uses granular policy check for valid resource in requireWriteRole', async () => {
    vi.mocked(hasPermission).mockReturnValue(true)
    const session = await requireWriteRole('beds')
    expect(session.userId).toBe('u-1')
    // Should call hasPermission since 'beds' is a valid predefined resource
    expect(hasPermission).toHaveBeenCalledWith('nurse', 'beds', 'write')
  })

  it('denies delete action via requireDeleteRole when permission is missing', async () => {
    vi.mocked(hasPermission).mockReturnValue(false)
    await expect(requireDeleteRole('users')).rejects.toThrow(/Forbidden/)
    expect(logPolicyViolation).toHaveBeenCalled()
  })
})