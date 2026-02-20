import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { appendRecoveryLog } from '@/shared/lib/recovery-draft'
import { RecoveryLogPanel } from './RecoveryLogPanel'

describe('RecoveryLogPanel', () => {
  it('shows empty state when no logs are recorded', () => {
    localStorage.clear()

    render(<RecoveryLogPanel />)

    expect(screen.getByText('No recovery events recorded yet.')).toBeInTheDocument()
  })

  it('shows most recent recovery logs first', () => {
    localStorage.clear()
    appendRecoveryLog('stage_form_restored')
    appendRecoveryLog('global_threshold_saved')

    render(<RecoveryLogPanel />)

    const entries = screen.getAllByRole('listitem')
    expect(entries).toHaveLength(2)
    expect(entries[0].textContent?.toLowerCase()).toContain('global threshold saved')
    expect(entries[1].textContent?.toLowerCase()).toContain('stage form restored')
  })

  it('clears logs after user confirms clear action', () => {
    localStorage.clear()
    appendRecoveryLog('stage_form_restored')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<RecoveryLogPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear Logs' }))

    expect(confirmSpy).toHaveBeenCalledWith('Clear all recovery logs?')
    expect(screen.getByText('No recovery events recorded yet.')).toBeInTheDocument()
  })
})