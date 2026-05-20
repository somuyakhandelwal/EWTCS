import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../actions/auditor-history-actions', () => ({
  fetchAuditorBedHistory: vi.fn(),
  exportAuditorBedHistoryCSV: vi.fn(),
}))

import { AuditorHistoryView } from '../components/AuditorHistoryView'
import {
  fetchAuditorBedHistory,
  exportAuditorBedHistoryCSV,
} from '../actions/auditor-history-actions'

describe('AuditorHistoryView audit mode read access', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(fetchAuditorBedHistory).mockResolvedValue({
      success: true,
      data: {
        rows: [
          {
            id: 'log-1',
            bedId: 'bed-1',
            bedNumber: 'ER-01',
            fromStageName: 'Initial Investigation',
            toStageName: 'Initial Treatment',
            changedByUserId: 'u-1',
            changedByUsername: 'admin1',
            transitionTime: new Date('2026-02-20T10:00:00.000Z'),
            durationInPreviousStageMs: 1000,
            notes: null,
            shiftId: null,
            shiftName: null,
          },
        ],
        totalCount: 1,
      },
    })

    vi.mocked(exportAuditorBedHistoryCSV).mockResolvedValue({
      success: true,
      data: 'header\nrow',
    })
  })

  it('allows all read-only controls in audit mode', async () => {
    render(<AuditorHistoryView readOnly />)

    await screen.findByText('ER-01')

    // Export, filter, sort and pagination are all read-only operations.
    // Auditors must be able to use them — disabling them was a bug.
    expect(screen.getByRole('button', { name: 'Export CSV' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Apply Filters' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /Timestamp/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /Bed/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /To/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /Username/i })).not.toBeDisabled()
  })
})
