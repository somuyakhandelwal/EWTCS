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
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('autosaves stage edits without manual save button', async () => {
    vi.mocked(updateStage).mockResolvedValue(undefined)
    const onSaved = vi.fn()

    render(<StageFormModal stage={stage} onClose={() => undefined} onSaved={onSaved} />)

    expect(screen.queryByText('Save Stage')).not.toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('e.g. Triage In Progress'), {
      target: { value: 'Triage Updated' },
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
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

  it('retries autosave failures and alerts after retries are exhausted', async () => {
    vi.mocked(updateStage).mockRejectedValue(new Error('save failed'))
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined)

    render(<StageFormModal stage={stage} onClose={() => undefined} onSaved={() => undefined} />)

    fireEvent.change(screen.getByPlaceholderText('Stage description...'), {
      target: { value: 'Updated description' },
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1400)
    })

    expect(updateStage).toHaveBeenCalledTimes(3)
    expect(alertSpy).toHaveBeenCalledWith('Auto-save failed after retries. Please try again.')
  })

  it('does not retry or alert on non-transient validation errors', async () => {
    vi.mocked(updateStage).mockRejectedValue(new Error('Validation error'))
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined)

    render(<StageFormModal stage={stage} onClose={() => undefined} onSaved={() => undefined} />)

    fireEvent.change(screen.getByPlaceholderText('Stage description...'), {
      target: { value: 'Updated description' },
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(updateStage).toHaveBeenCalledTimes(1)
    expect(alertSpy).not.toHaveBeenCalled()
    expect(screen.getByText('Validation error')).toBeInTheDocument()
  })
})
