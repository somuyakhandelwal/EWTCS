import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/shared/lib/active-session', () => ({ verifyActiveSession: vi.fn() }))
vi.mock('@/features/user-management/actions/user-management-actions', () => ({
  getAllUsers: vi.fn(),
  getUserLogs: vi.fn(),
}))
vi.mock('@/features/user-management/lib/queries', () => ({ getWards: vi.fn() }))
vi.mock('@/features/bed-dashboard/components/DepartmentMetricsView', () => ({
  DepartmentMetricsView: () => <div>Workflow Metrics Strip</div>,
}))
vi.mock('@/features/auth/components/LogoutButton', () => ({ LogoutButton: () => <button>Logout</button> }))
vi.mock('./components/AdminRecentActivity', () => ({ AdminRecentActivity: () => <div>Admin Activity</div> }))
vi.mock('./components/AdminQuickActions', () => ({ AdminQuickActions: () => <div>Admin Quick Actions</div> }))
vi.mock('@/features/user-management/components/UserManagementTable', () => ({
  default: () => <div>User Table</div>,
}))
vi.mock('@/features/user-management/components/CreateUserDialog', () => ({
  default: () => <div>Create User</div>,
}))
vi.mock('@/features/user-management/components/KioskSessionsPanel', () => ({
  KioskSessionsPanel: () => <div>Kiosk Sessions</div>,
}))
vi.mock('@/features/ai-summary/components/DailySummaryTrigger', () => ({
  DailySummaryTrigger: () => <div>Daily Summary Trigger</div>,
}))
vi.mock('@/features/ai-summary/components/DailySummaryHistory', () => ({
  DailySummaryHistory: () => <div>Daily Summary History</div>,
}))
vi.mock('@/features/data-retention/components/BackupStatusPanel', () => ({
  BackupStatusPanel: () => <div>Backup Status</div>,
}))
vi.mock('@/features/bed-dashboard/components/OfflineQueueMonitor', () => ({
  OfflineQueueMonitor: () => <div>Offline Queue Monitor</div>,
}))
vi.mock('@/features/system-health/components/SystemHealthPanel', () => ({
  SystemHealthPanel: () => <div>System Health</div>,
}))
vi.mock('@/features/system-health/components/MetricsPanel', () => ({
  MetricsPanel: () => <div>Metrics Panel</div>,
}))

import AdminDashboard from './page'
import { verifyActiveSession } from '@/shared/lib/active-session'
import {
  getAllUsers,
  getUserLogs,
} from '@/features/user-management/actions/user-management-actions'
import { getWards } from '@/features/user-management/lib/queries'

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyActiveSession).mockResolvedValue({ username: 'admin1' } as never)
    vi.mocked(getAllUsers).mockResolvedValue({ success: true, users: [] } as never)
    vi.mocked(getUserLogs).mockResolvedValue({ success: true, logs: [] } as never)
    vi.mocked(getWards).mockResolvedValue([] as never)
  })

  it('renders the shared workflow metrics strip for admins', async () => {
    render(await AdminDashboard())

    expect(screen.getByText('Workflow Metrics Strip')).toBeDefined()
    expect(screen.getByText('Daily Summary History')).toBeDefined()
  })
})
