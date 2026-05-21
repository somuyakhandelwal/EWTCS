import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TriageDashboardClient } from '../components/TriageDashboardClient'
import type { TriageBed, TriageState } from '../types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('../actions', () => ({
  assignTriagePatient: vi.fn(),
  transitionTriageBed: vi.fn(),
  updateTriagePatientDetails: vi.fn(),
}))

function makeBed(index: number, state: TriageState = 'empty'): TriageBed {
  return {
    id: `00000000-0000-0000-0000-00000000000${index}`,
    bedNumber: `TRIAGE-0${index}`,
    state,
    lastStateChange: new Date('2026-05-21T08:00:00Z'),
    patientStartTime: null,
    patient: state === 'empty'
      ? null
      : {
          patientUhid: `UH-${index}`,
          patientName: `Patient ${index}`,
          patientAge: 40,
          patientGender: 'Unknown',
          keySymptom: 'Chest pain',
          triageCategory: 'Urgent',
        },
  }
}

describe('TriageDashboardClient', () => {
  it('renders exactly six triage beds', () => {
    const beds = Array.from({ length: 6 }, (_, index) => makeBed(index + 1))
    render(<TriageDashboardClient initialBeds={beds} />)

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(6)
    expect(screen.getByText('TRIAGE-01')).toBeInTheDocument()
    expect(screen.getByText('TRIAGE-06')).toBeInTheDocument()
  })

  it('does not render ER-only stage options', () => {
    render(<TriageDashboardClient initialBeds={[makeBed(1, 'initial_treatment')]} />)

    expect(screen.queryByText(/Initial Investigation/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Drugs\/Test/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Observation/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Discharge Process/i)).not.toBeInTheDocument()
  })

  it('renders the correct actions for each state', () => {
    const beds = [
      makeBed(1, 'empty'),
      makeBed(2, 'initial_treatment'),
      makeBed(3, 'decision_made'),
      makeBed(4, 'cleaning'),
    ]
    render(<TriageDashboardClient initialBeds={beds} />)

    expect(screen.getByText('Assign Patient')).toBeInTheDocument()
    expect(screen.getByText('Mark Decision Made')).toBeInTheDocument()
    expect(screen.getByText('Move to Cleaning')).toBeInTheDocument()
    expect(screen.getByText('Cleaning Complete')).toBeInTheDocument()
  })
})
