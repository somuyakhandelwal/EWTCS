// AlertCard Component Tests
// EPIC 15: Notifications & Alerts (US-15.4)

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/features/alerts/actions/alert-actions', () => ({
  acknowledgeAlertAction: vi.fn(),
}))
vi.mock('../AlertSeverityBadge', () => ({
  AlertSeverityBadge: ({ severity, type }: { severity: string; type: string }) => (
    <span data-testid="severity-badge">{severity} · {type}</span>
  ),
}))
vi.mock('@/shared/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ComponentPropsWithoutRef<'button'>) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}))
vi.mock('@/shared/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

import { acknowledgeAlertAction } from '@/features/alerts/actions/alert-actions'
import { AlertCard } from '../AlertCard'
import type { Alert } from '../../types/alert'

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: 'delayed_bed:bed-1',
  type: 'delayed_bed',
  severity: 'warning',
  title: 'Bed ER-01 — Extended Wait',
  description: 'Patient waiting 4h in Triage',
  bedId: 'bed-1',
  bedNumber: 'ER-01',
  elapsedTimeMs: 14_400_000,
  isAcknowledged: false,
  acknowledgedAt: null,
  acknowledgedBy: null,
  acknowledgedUntil: null,
  startedAt: new Date('2026-03-07T08:00:00Z'),
  ...overrides,
})

describe('AlertCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders title and description', () => {
    render(<AlertCard alert={makeAlert()} onAcknowledged={vi.fn()} />)

    expect(screen.getByText('Bed ER-01 — Extended Wait')).toBeInTheDocument()
    expect(screen.getByText('Patient waiting 4h in Triage')).toBeInTheDocument()
  })

  it('renders "Bed" label for bed-specific alert types', () => {
    render(<AlertCard alert={makeAlert()} onAcknowledged={vi.fn()} />)

    // The bed number renders in the meta row, and "Source" label is absent
    expect(screen.getByText('ER-01')).toBeInTheDocument()
    expect(screen.queryByText(/^Source/)).not.toBeInTheDocument()
  })

  it('renders "Source" label for system_error alerts', () => {
    const sysAlert = makeAlert({
      id: 'system_error:err-1',
      type: 'system_error',
      severity: 'critical',
      title: 'System Error — database',
      description: 'Connection pool exhausted',
      bedId: null,
      bedNumber: 'database',
    })
    render(<AlertCard alert={sysAlert} onAcknowledged={vi.fn()} />)

    expect(screen.getByText(/^Source/)).toBeInTheDocument()
    expect(screen.getByText('database')).toBeInTheDocument()
  })

  it('shows acknowledged chip when alert is acknowledged', () => {
    const acked = makeAlert({
      isAcknowledged: true,
      acknowledgedBy: 'supervisor1',
      acknowledgedUntil: new Date('2026-03-07T16:00:00Z'),
    })
    render(<AlertCard alert={acked} onAcknowledged={vi.fn()} />)

    expect(screen.getByText(/Acknowledged by/)).toBeInTheDocument()
    expect(screen.getByText(/supervisor1/)).toBeInTheDocument()
  })

  it('calls acknowledgeAlertAction with correct args on click', async () => {
    vi.mocked(acknowledgeAlertAction).mockResolvedValue({ success: true })
    const onAcknowledged = vi.fn()

    render(<AlertCard alert={makeAlert()} onAcknowledged={onAcknowledged} />)
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }))

    await waitFor(() => {
      expect(acknowledgeAlertAction).toHaveBeenCalledWith(
        expect.objectContaining({
          alertKey: 'delayed_bed:bed-1',
          alertType: 'delayed_bed',
          bedId: 'bed-1',
        })
      )
      expect(onAcknowledged).toHaveBeenCalled()
    })
  })

  it('shows an inline error message when acknowledge fails', async () => {
    vi.mocked(acknowledgeAlertAction).mockResolvedValue({
      success: false,
      error: 'Server unavailable',
    })

    render(<AlertCard alert={makeAlert()} onAcknowledged={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }))

    await waitFor(() => {
      expect(screen.getByText('Server unavailable')).toBeInTheDocument()
    })
  })

  it('shows "Re-acknowledge" label when alert is already acknowledged', () => {
    const acked = makeAlert({
      isAcknowledged: true,
      acknowledgedBy: 'supervisor1',
      acknowledgedUntil: new Date('2026-03-07T16:00:00Z'),
    })
    render(<AlertCard alert={acked} onAcknowledged={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Re-acknowledge' })).toBeInTheDocument()
  })
})
