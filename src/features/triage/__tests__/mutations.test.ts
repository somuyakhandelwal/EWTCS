import { beforeEach, describe, expect, it, vi } from 'vitest'

const { connectMock, queryMock, releaseMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
  queryMock: vi.fn(),
  releaseMock: vi.fn(),
}))

vi.mock('@/shared/lib/db', () => ({
  __esModule: true,
  default: { connect: connectMock },
}))

vi.mock('@/shared/config/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  assignPatientInDB,
  transitionTriageBedInDB,
} from '../mutations'

const BED_ID = '11111111-1111-4111-8111-111111111111'
const USER_ID = '22222222-2222-4222-8222-222222222222'

const patient = {
  patientUhid: 'UH-1',
  patientIpdId: null,
  patientName: 'Jane Doe',
  patientAge: 42,
  patientGender: 'Female' as const,
  keySymptom: 'Chest pain',
  triageCategory: 'Urgent' as const,
}

function setupClient() {
  queryMock.mockReset()
  releaseMock.mockReset()
  connectMock.mockResolvedValue({ query: queryMock, release: releaseMock })
}

function mockLockedBed(state = 'empty', wardCode = 'TRIAGE') {
  queryMock
    .mockResolvedValueOnce({ rows: [], rowCount: null })
    .mockResolvedValueOnce({ rows: [{ id: BED_ID, bedNumber: 'TRIAGE-01', wardCode }] })
    .mockResolvedValueOnce({
      rows: [{ state, lastStateChange: new Date('2026-05-21T08:00:00Z') }],
    })
}

describe('triage mutations', () => {
  beforeEach(() => setupClient())

  it('assignment writes patient data, state log, and audit log in one transaction', async () => {
    mockLockedBed('empty')
    queryMock.mockResolvedValue({ rows: [], rowCount: null })

    await assignPatientInDB(BED_ID, patient, USER_ID)

    const sql = queryMock.mock.calls.map((call) => String(call[0]))
    expect(sql[0]).toBe('BEGIN')
    expect(sql.some((text) => text.includes('UPDATE beds'))).toBe(true)
    expect(sql.some((text) => text.includes('UPDATE triage_bed_statuses'))).toBe(true)
    expect(sql.some((text) => text.includes('INSERT INTO triage_state_logs'))).toBe(true)
    expect(sql.some((text) => text.includes('INSERT INTO audit_logs'))).toBe(true)
    expect(sql.at(-1)).toBe('COMMIT')
    expect(releaseMock).toHaveBeenCalledTimes(1)
  })

  it('rejects non-triage beds before state changes are written', async () => {
    mockLockedBed('empty', 'ER')

    await expect(transitionTriageBedInDB(BED_ID, 'cleaning', USER_ID)).rejects.toThrow(
      'Only triage beds can use triage workflow.'
    )

    const sql = queryMock.mock.calls.map((call) => String(call[0]))
    expect(sql.some((text) => text.includes('INSERT INTO triage_state_logs'))).toBe(false)
    expect(sql).toContain('ROLLBACK')
  })

  it('rejects invalid triage transitions without audit writes', async () => {
    mockLockedBed('decision_made')

    await expect(transitionTriageBedInDB(BED_ID, 'initial_treatment', USER_ID)).rejects.toThrow(
      'Cannot move triage bed'
    )

    const sql = queryMock.mock.calls.map((call) => String(call[0]))
    expect(sql.some((text) => text.includes('INSERT INTO audit_logs'))).toBe(false)
    expect(sql).toContain('ROLLBACK')
  })
})
