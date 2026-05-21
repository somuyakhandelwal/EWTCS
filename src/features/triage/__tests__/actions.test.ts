import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  assignPatientInDBMock,
  requireRoleMock,
  revalidatePathMock,
  transitionTriageBedInDBMock,
  updatePatientInDBMock,
} = vi.hoisted(() => ({
  assignPatientInDBMock: vi.fn(),
  requireRoleMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  transitionTriageBedInDBMock: vi.fn(),
  updatePatientInDBMock: vi.fn(),
}))

vi.mock('@/shared/lib/auth', () => ({
  requireRole: requireRoleMock,
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

vi.mock('../mutations', () => ({
  assignPatientInDB: assignPatientInDBMock,
  transitionTriageBedInDB: transitionTriageBedInDBMock,
  updatePatientInDB: updatePatientInDBMock,
}))

import {
  assignTriagePatient,
  transitionTriageBed,
  updateTriagePatientDetails,
} from '../actions'

const BED_ID = '11111111-1111-4111-8111-111111111111'

const patient = {
  patientUhid: ' UH-1 ',
  patientIpdId: ' ',
  patientName: ' Jane Doe ',
  patientAge: 42,
  patientGender: 'Female' as const,
  keySymptom: ' Chest pain ',
  triageCategory: 'Urgent' as const,
}

describe('triage actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireRoleMock.mockResolvedValue({ userId: 'user-1', role: 'nurse' })
  })

  it('assigns a patient and normalizes triage details', async () => {
    assignPatientInDBMock.mockResolvedValue(undefined)

    const result = await assignTriagePatient({ bedId: BED_ID, patient })

    expect(result).toEqual({ success: true })
    expect(assignPatientInDBMock).toHaveBeenCalledWith(
      BED_ID,
      expect.objectContaining({
        patientUhid: 'UH-1',
        patientIpdId: null,
        patientName: 'Jane Doe',
        keySymptom: 'Chest pain',
      }),
      'user-1'
    )
    expect(revalidatePathMock).toHaveBeenCalledWith('/triage')
  })

  it('rejects ER-only target states before mutation code runs', async () => {
    const result = await transitionTriageBed({ bedId: BED_ID, toState: 'observation' } as never)

    expect(result.success).toBe(false)
    expect(result.errors?.toState).toBeDefined()
    expect(transitionTriageBedInDBMock).not.toHaveBeenCalled()
  })

  it('prevents housekeeping from moving clinical triage states', async () => {
    requireRoleMock.mockResolvedValue({ userId: 'user-2', role: 'housekeeping' })

    const result = await transitionTriageBed({ bedId: BED_ID, toState: 'decision_made' })

    expect(result).toEqual({ success: false, error: 'Housekeeping can only complete cleaning.' })
    expect(transitionTriageBedInDBMock).not.toHaveBeenCalled()
  })

  it('surfaces non-triage bed rejection from mutation layer', async () => {
    transitionTriageBedInDBMock.mockRejectedValue(new Error('Only triage beds can use triage workflow.'))

    const result = await transitionTriageBed({ bedId: BED_ID, toState: 'empty' })

    expect(result).toEqual({
      success: false,
      error: 'Only triage beds can use triage workflow.',
    })
  })

  it('updates details without changing triage state', async () => {
    updatePatientInDBMock.mockResolvedValue(undefined)

    const result = await updateTriagePatientDetails({ bedId: BED_ID, patient })

    expect(result).toEqual({ success: true })
    expect(updatePatientInDBMock).toHaveBeenCalledWith(BED_ID, expect.any(Object), 'user-1')
  })
})
