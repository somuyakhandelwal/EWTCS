import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditBedDialog } from './EditBedDialog'
import { updateBed } from '../actions/bed-crud-actions'

vi.mock('../actions/bed-crud-actions', () => ({
  updateBed: vi.fn(),
}))

const bed = {
  id: 'bed-1',
  bedNumber: 'ER-01',
  wardId: 'ward-1',
  wardName: 'Emergency',
  currentStageId: 'stage-1',
  currentStageName: 'Triage',
  isOccupied: true,
  isActive: true,
  isTemporary: false,
  isVirtual: false,
  location: 'Room 1',
  patientStartTime: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const wards = [{ id: 'ward-1', name: 'Emergency' }]

describe('EditBedDialog recovery', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('restores unsaved draft when user confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    localStorage.setItem('ewtcs:edit-bed-draft:bed-1', JSON.stringify({
      version: 1,
      updatedAt: Date.now(),
      data: { bedNumber: 'ER-09', wardId: 'ward-1', location: 'Room X' },
    }))

    render(
      <EditBedDialog bed={bed} wards={wards} onClose={() => undefined} onSuccess={() => undefined} />
    )

    expect(screen.getByDisplayValue('ER-09')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Room X')).toBeInTheDocument()
    expect(screen.getByText('Recovered unsaved bed edits from previous session.')).toBeInTheDocument()
  })

  it('shows error and keeps draft when update fails', async () => {
    vi.mocked(updateBed).mockResolvedValue({ success: false, error: 'network down' })

    render(
      <EditBedDialog bed={bed} wards={wards} onClose={() => undefined} onSuccess={() => undefined} />
    )

    fireEvent.change(screen.getByLabelText('Bed Number *'), { target: { value: 'ER-77' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Update Bed' }).closest('form')!)

    await waitFor(() => {
      expect(screen.getByText('network down')).toBeInTheDocument()
    })

    expect(localStorage.getItem('ewtcs:edit-bed-draft:bed-1')).toContain('ER-77')
  })
})