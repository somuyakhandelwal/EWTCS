import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/shared/lib/active-session', () => ({ verifyActiveSession: vi.fn() }))
vi.mock('@/features/bed-dashboard/actions/bed-grid-actions', () => ({ getBedGridData: vi.fn() }))
vi.mock('@/features/notifications/actions/alert-screen-actions', () => ({
  getUnacknowledgedAlertCount: vi.fn(),
}))
vi.mock('@/features/bed-dashboard/components/DepartmentMetricsView', () => ({
  DepartmentMetricsView: () => <div>Workflow Metrics Strip</div>,
}))
vi.mock('./SupervisorClientShell', () => ({
  SupervisorClientShell: () => <div>Supervisor Client Shell</div>,
}))
vi.mock('@/features/ai-summary/components/SupervisorSummarySection', () => ({
  SupervisorSummarySection: () => <div>Supervisor Summary Section</div>,
}))
vi.mock('@/features/auth/components/LogoutButton', () => ({ LogoutButton: () => <button>Logout</button> }))
vi.mock('@/features/auth/components/KioskBanner', () => ({ KioskBanner: () => <div>Kiosk Banner</div> }))
vi.mock('@/shared/components/ui/tooltip', () => ({ Tooltip: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('@/features/adoption/components/FeedbackForm', () => ({ FeedbackForm: () => <div>Feedback Form</div> }))

import SupervisorDashboard from './page'
import { verifyActiveSession } from '@/shared/lib/active-session'
import { getBedGridData } from '@/features/bed-dashboard/actions/bed-grid-actions'
import { getUnacknowledgedAlertCount } from '@/features/notifications/actions/alert-screen-actions'

describe('SupervisorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyActiveSession).mockResolvedValue({
      username: 'supervisor1',
      isKiosk: false,
    } as never)
    vi.mocked(getBedGridData).mockResolvedValue({ success: true, data: {} } as never)
    vi.mocked(getUnacknowledgedAlertCount).mockResolvedValue({ success: true, count: 0 } as never)
  })

  it('renders the shared workflow metrics strip for supervisors', async () => {
    render(await SupervisorDashboard())

    expect(screen.getByText('Workflow Metrics Strip')).toBeDefined()
    expect(screen.getByText('Supervisor Client Shell')).toBeDefined()
  })
})
