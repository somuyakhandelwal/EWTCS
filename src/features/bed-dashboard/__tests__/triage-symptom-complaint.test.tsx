import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TriageModalFormFields } from '../components/TriageModalFormFields'
import { BedTriageInfo } from '../components/BedTriageInfo'

describe('US-22.1 Symptoms / Complaint', () => {
  it('renders Symptoms / Complaint label and examples in triage form', () => {
    render(
      <TriageModalFormFields
        firstInputRef={{ current: null }}
        isSubmitting={false}
        triageCategory="Urgent"
        patientUhid="UH-1"
        patientIpdId=""
        patientName="John"
        patientAge="45"
        patientGender="Male"
        keySymptom=""
        setTriageCategory={vi.fn()}
        setPatientUhid={vi.fn()}
        setPatientIpdId={vi.fn()}
        setPatientName={vi.fn()}
        setPatientAge={vi.fn()}
        setPatientGender={vi.fn()}
        setKeySymptom={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Symptoms / Complaint')).toBeInTheDocument()
    expect(screen.getByText(/Examples: Chest pain, Road traffic accident trauma/i)).toBeInTheDocument()
  })

  it('enforces 40-character limit in UI change handler', () => {
    const setKeySymptom = vi.fn()

    render(
      <TriageModalFormFields
        firstInputRef={{ current: null }}
        isSubmitting={false}
        triageCategory="Urgent"
        patientUhid="UH-1"
        patientIpdId=""
        patientName="John"
        patientAge="45"
        patientGender="Male"
        keySymptom=""
        setTriageCategory={vi.fn()}
        setPatientUhid={vi.fn()}
        setPatientIpdId={vi.fn()}
        setPatientName={vi.fn()}
        setPatientAge={vi.fn()}
        setPatientGender={vi.fn()}
        setKeySymptom={setKeySymptom}
      />
    )

    const complaintInput = screen.getByLabelText('Symptoms / Complaint')
    const tooLong = 'x'.repeat(60)
    fireEvent.change(complaintInput, { target: { value: tooLong } })

    expect(setKeySymptom).toHaveBeenCalledWith('x'.repeat(40))
    expect(complaintInput).toHaveAttribute('maxLength', '40')
  })

  it('visualizes example complaint text in bed triage info', () => {
    render(
      <BedTriageInfo
        triageInfo={{
          triageCategory: 'Urgent',
          patientName: 'John Doe',
          keySymptom: 'Chest pain',
        }}
      />
    )

    expect(screen.getByText('Symptoms / Complaint: Chest pain')).toBeInTheDocument()
  })
})
