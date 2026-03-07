import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { StageFormModal } from './StageFormModal'
import { updateStage } from '../actions/stage-actions'

vi.mock('../actions/stage-actions', () => ({
  createStage: vi.fn(),
  updateStage: vi.fn(),
}))

const stage = {
  id: 'stage-1',
  name: 'Triage',
  color_code: 'blue',
  description: 'Initial assessment',
  display_order: 1,
  is_default: false,
  is_active: true,
  threshold_minutes: 45,
  created_at: '',
  updated_at: '',
}

describe('StageFormModal autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('saves stage edits when Save button is clicked', async () => {
    vi.mocked(updateStage).mockResolvedValue(undefined)
    const onSaved = vi.fn()

    render(<StageFormModal stage={stage} onClose={() => undefined} onSaved={onSaved} />)

    expect(screen.getByText('Save Stage')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('e.g. Triage In Progress'), {
      target: { value: 'Triage Updated' },
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Save Stage'))
    })

    expect(updateStage).toHaveBeenCalledTimes(1)
    expect(updateStage).toHaveBeenCalledWith({
      id: 'stage-1',
      name: 'Triage Updated',
      color_code: 'blue',
      description: 'Initial assessment',
      threshold_minutes: 45,
    })
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('retries save failures and shows error after retries are exhausted', async () => {
    vi.mocked(updateStage).mockRejectedValue(new Error('save failed'))

    render(<StageFormModal stage={stage} onClose={() => undefined} onSaved={() => undefined} />)

    fireEvent.change(screen.getByPlaceholderText('Stage description...'), {
      target: { value: 'Updated description' },
    })

    // Click Save and advance timers through retry backoff delays (250ms + 500ms)
    await act(async () => {
      fireEvent.click(screen.getByText('Save Stage'))
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(updateStage).toHaveBeenCalledTimes(3)
    expect(screen.getByText('save failed')).toBeInTheDocument()
  })

  it('does not retry on non-transient errors and shows error message', async () => {
    vi.mocked(updateStage).mockRejectedValue(new Error('Validation error'))

    render(<StageFormModal stage={stage} onClose={() => undefined} onSaved={() => undefined} />)

    fireEvent.change(screen.getByPlaceholderText('Stage description...'), {
      target: { value: 'Updated description' },
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Save Stage'))
    })

    expect(updateStage).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Validation error')).toBeInTheDocument()
  })

  it('prompts to restore and loads unsaved draft from localStorage', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    localStorage.setItem(
      'ewtcs:stage-form-draft:stage-1',
      JSON.stringify({
        version: 1,
        updatedAt: Date.now(),
        data: {
          name: 'Recovered Stage',
          color: 'green',
          desc: 'Recovered description',
          thresholdHours: 2,
          thresholdMins: 15,
        },
      })
    )

    render(<StageFormModal stage={stage} onClose={() => undefined} onSaved={() => undefined} />)

    expect(confirmSpy).toHaveBeenCalledWith('Unsaved stage form changes were found. Restore them now?')
    expect(screen.getByDisplayValue('Recovered Stage')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Recovered description')).toBeInTheDocument()
    expect(screen.getByText('Recovered unsaved changes from previous session.')).toBeInTheDocument()
  })

  it('discards draft when restore prompt is rejected', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    localStorage.setItem(
      'ewtcs:stage-form-draft:stage-1',
      JSON.stringify({
        version: 1,
        updatedAt: Date.now(),
        data: {
          name: 'Rejected draft',
          color: 'green',
          desc: 'Rejected description',
          thresholdHours: 2,
          thresholdMins: 30,
        },
      })
    )

    render(<StageFormModal stage={stage} onClose={() => undefined} onSaved={() => undefined} />)

    expect(confirmSpy).toHaveBeenCalledWith('Unsaved stage form changes were found. Restore them now?')
    expect(screen.getByDisplayValue('Triage')).toBeInTheDocument()
    expect(screen.queryByText('Recovered unsaved changes from previous session.')).not.toBeInTheDocument()
    expect(localStorage.getItem('ewtcs:stage-form-draft:stage-1')).toBeNull()
  })
})
