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
            fromStageName: 'Registration',
            toStageName: 'Triage',
            changedByUserId: 'u-1',
            changedByUsername: 'admin1',
            transitionTime: new Date('2026-02-20T10:00:00.000Z'),
            durationInPreviousStageMs: 1000,
            notes: null,
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

  it('disables action controls in read-only audit mode', async () => {
    render(<AuditorHistoryView readOnly />)

    await screen.findByText('ER-01')

    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Apply Filters' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Timestamp/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Bed/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /To/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Username/i })).toBeDisabled()
  })
})
