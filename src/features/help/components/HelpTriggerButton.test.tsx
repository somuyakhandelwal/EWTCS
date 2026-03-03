import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HelpTriggerButton } from './HelpTriggerButton'

describe('HelpTriggerButton', () => {
  it('renders a button element', () => {
    render(<HelpTriggerButton isOpen={false} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders "Help" label text', () => {
    render(<HelpTriggerButton isOpen={false} onClick={vi.fn()} />)
    expect(screen.getByText('Help')).toBeInTheDocument()
  })

  it('has "Open help panel" aria-label when isOpen is false', () => {
    render(<HelpTriggerButton isOpen={false} onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /open help panel/i })).toBeInTheDocument()
  })

  it('has "Close help panel" aria-label when isOpen is true', () => {
    render(<HelpTriggerButton isOpen={true} onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /close help panel/i })).toBeInTheDocument()
  })

  it('calls onClick handler when button is clicked', () => {
    const onClick = vi.fn()
    render(<HelpTriggerButton isOpen={false} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when not clicked', () => {
    const onClick = vi.fn()
    render(<HelpTriggerButton isOpen={false} onClick={onClick} />)
    expect(onClick).not.toHaveBeenCalled()
  })
})
