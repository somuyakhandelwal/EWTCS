import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { GlobalThresholdForm } from './GlobalThresholdForm'
import { setGlobalThresholdAction } from '@/shared/actions/settings-actions'

vi.mock('@/shared/actions/settings-actions', () => ({
  setGlobalThresholdAction: vi.fn(),
}))

describe('GlobalThresholdForm autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('autosaves after debounce and shows brief confirmation', async () => {
    vi.mocked(setGlobalThresholdAction).mockResolvedValue({ success: true })

    render(<GlobalThresholdForm initialMinutes={60} />)

    const [, minuteInput] = screen.getAllByRole('spinbutton')
    fireEvent.change(minuteInput, { target: { value: '5' } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(setGlobalThresholdAction).toHaveBeenCalledTimes(1)
    expect(setGlobalThresholdAction).toHaveBeenCalledWith({ hours: 1, minutes: 5 })

    expect(screen.getByText('✓ Threshold updated — applies immediately')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })

    expect(screen.queryByText('✓ Threshold updated — applies immediately')).not.toBeInTheDocument()
  })

  it('retries failed saves and alerts after retries are exhausted', async () => {
    vi.mocked(setGlobalThresholdAction).mockResolvedValue({ success: false, error: 'network down' })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined)

    render(<GlobalThresholdForm initialMinutes={60} />)

    const [hourInput] = screen.getAllByRole('spinbutton')
    fireEvent.change(hourInput, { target: { value: '2' } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
      await vi.advanceTimersByTimeAsync(250)
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(setGlobalThresholdAction).toHaveBeenCalledTimes(3)

    expect(alertSpy).toHaveBeenCalledWith('Auto-save failed after retries. Please retry your threshold change.')
    expect(screen.getByText('network down')).toBeInTheDocument()
  })

  it('does not retry or alert for non-transient validation errors', async () => {
    vi.mocked(setGlobalThresholdAction).mockResolvedValue({ success: false, error: 'Validation error' })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined)

    render(<GlobalThresholdForm initialMinutes={60} />)

    const [hourInput] = screen.getAllByRole('spinbutton')
    fireEvent.change(hourInput, { target: { value: '2' } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(setGlobalThresholdAction).toHaveBeenCalledTimes(1)
    expect(alertSpy).not.toHaveBeenCalled()
    expect(screen.getByText('Validation error')).toBeInTheDocument()
  })
})
