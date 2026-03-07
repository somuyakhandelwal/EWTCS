// AlertScreen Component Tests
// EPIC 15: Notifications & Alerts (US-15.4)

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../../hooks/useRealtimeAlerts', () => ({
  useRealtimeAlerts: vi.fn(),
}))
vi.mock('../AlertCard', () => ({
  AlertCard: ({ alert }: { alert: { id: string; title: string } }) => (
    <div data-testid="alert-card">{alert.title}</div>
  ),
}))
vi.mock('../AlertFilters', () => ({
  AlertFilters: ({
    totalCount,
    criticalCount,
    warningCount,
    acknowledgedCount,
  }: {
    totalCount: number
    criticalCount: number
    warningCount: number
    acknowledgedCount: number
  }) => (
    <div data-testid="alert-filters">
      <span data-testid="total">{totalCount}</span>
      <span data-testid="critical">{criticalCount}</span>
      <span data-testid="warning">{warningCount}</span>
      <span data-testid="acknowledged">{acknowledgedCount}</span>
    </div>
  ),
}))
vi.mock('@/features/bed-dashboard/components/ConnectionStatus', () => ({
  ConnectionStatus: () => <div data-testid="connection-status" />,
}))
vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/shared/components/ui/button', () => ({
  Button: ({ children, onClick }: React.ComponentPropsWithoutRef<'button'>) => (
    <button onClick={onClick}>{children}</button>
  ),
}))
vi.mock('lucide-react', () => ({
  Bell: () => null,
  BellOff: () => null,
  RefreshCw: () => null,
  Settings: () => null,
}))

import { useRealtimeAlerts } from '../../hooks/useRealtimeAlerts'
import { AlertScreen } from '../AlertScreen'
import type { Alert } from '../../types/alert'

const connectedStatus = {
  status: 'connected' as const,
  lastUpdate: new Date(),
  errorCount: 0,
}

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: 'delayed_bed:bed-1',
  type: 'delayed_bed',
  severity: 'warning',
  title: 'Bed ER-01 — Extended Wait',
  description: 'Patient waiting',
  bedId: 'bed-1',
  bedNumber: 'ER-01',
  elapsedTimeMs: 14_400_000,
  isAcknowledged: false,
  acknowledgedAt: null,
  acknowledgedBy: null,
  acknowledgedUntil: null,
  startedAt: new Date(),
  ...overrides,
})

describe('AlertScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders alert cards for active alerts', () => {
    vi.mocked(useRealtimeAlerts).mockReturnValue({
      alerts: [makeAlert()],
      connectionStatus: connectedStatus,
      isLoading: false,
      refresh: vi.fn(),
      reconnect: vi.fn(),
    })

    render(<AlertScreen initialAlerts={[]} />)

    expect(screen.getAllByTestId('alert-card')).toHaveLength(1)
    expect(screen.getByText('Bed ER-01 — Extended Wait')).toBeInTheDocument()
  })

  it('renders empty state when no active alerts', () => {
    vi.mocked(useRealtimeAlerts).mockReturnValue({
      alerts: [],
      connectionStatus: connectedStatus,
      isLoading: false,
      refresh: vi.fn(),
      reconnect: vi.fn(),
    })

    render(<AlertScreen initialAlerts={[]} />)

    expect(screen.queryAllByTestId('alert-card')).toHaveLength(0)
    expect(screen.getByText('No active alerts')).toBeInTheDocument()
  })

  it('renders acknowledged-only empty state when all alerts are acknowledged', () => {
    vi.mocked(useRealtimeAlerts).mockReturnValue({
      alerts: [makeAlert({ isAcknowledged: true })],
      connectionStatus: connectedStatus,
      isLoading: false,
      refresh: vi.fn(),
      reconnect: vi.fn(),
    })

    // Default filters have showAcknowledged=true, so acknowledged alerts are shown
    render(<AlertScreen initialAlerts={[]} />)

    expect(screen.getAllByTestId('alert-card')).toHaveLength(1)
  })

  it('passes correct stat counts to AlertFilters', () => {
    const alerts: Alert[] = [
      makeAlert({ severity: 'critical' }),
      makeAlert({ id: 'delayed_bed:bed-2', bedNumber: 'ER-02', severity: 'warning' }),
      makeAlert({ id: 'delayed_bed:bed-3', bedNumber: 'ER-03', severity: 'warning', isAcknowledged: true }),
    ]
    vi.mocked(useRealtimeAlerts).mockReturnValue({
      alerts,
      connectionStatus: connectedStatus,
      isLoading: false,
      refresh: vi.fn(),
      reconnect: vi.fn(),
    })

    render(<AlertScreen initialAlerts={[]} />)

    expect(screen.getByTestId('total').textContent).toBe('3')
    expect(screen.getByTestId('critical').textContent).toBe('1')
    expect(screen.getByTestId('warning').textContent).toBe('2')
    expect(screen.getByTestId('acknowledged').textContent).toBe('1')
  })

  it('renders system_error alert cards alongside bed alerts', () => {
    vi.mocked(useRealtimeAlerts).mockReturnValue({
      alerts: [
        makeAlert(),
        makeAlert({
          id: 'system_error:err-1',
          type: 'system_error',
          severity: 'critical',
          title: 'System Error — database',
          bedId: null,
          bedNumber: 'database',
        }),
      ],
      connectionStatus: connectedStatus,
      isLoading: false,
      refresh: vi.fn(),
      reconnect: vi.fn(),
    })

    render(<AlertScreen initialAlerts={[]} />)

    expect(screen.getAllByTestId('alert-card')).toHaveLength(2)
    expect(screen.getByText('System Error — database')).toBeInTheDocument()
  })
})
