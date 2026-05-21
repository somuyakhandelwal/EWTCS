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

import { completeTriageDecisionInDB } from '../decision-mutations'

const TRIAGE_BED_ID = '11111111-1111-4111-8111-111111111111'
const ER_BED_ID = '33333333-3333-4333-8333-333333333333'
const USER_ID = '22222222-2222-4222-8222-222222222222'
const EMPTY_STAGE_ID = '44444444-4444-4444-8444-444444444444'
const ER_START_STAGE_ID = '55555555-5555-4555-8555-555555555555'

const patient = {
  patientUhid: 'UH-1',
  patientIpdId: 'IPD-1',
  patientName: 'Jane Doe',
  patientAge: 42,
  patientGender: 'Female',
  keySymptom: 'Chest pain',
  triageCategory: 'Urgent',
}

function setupClient() {
  queryMock.mockReset()
  releaseMock.mockReset()
  queryMock.mockResolvedValue({ rows: [], rowCount: 0 })
  connectMock.mockResolvedValue({ query: queryMock, release: releaseMock })
}

function mockDecisionMadeTriageBed() {
  queryMock
    .mockResolvedValueOnce({ rows: [], rowCount: 0 })
    .mockResolvedValueOnce({
      rows: [{ id: TRIAGE_BED_ID, bedNumber: 'TRIAGE-01', wardCode: 'TRIAGE' }],
    })
    .mockResolvedValueOnce({
      rows: [{ state: 'decision_made', lastStateChange: new Date('2026-05-21T08:00:00Z') }],
    })
    .mockResolvedValueOnce({ rows: [patient] })
}

describe('completeTriageDecisionInDB', () => {
  beforeEach(() => setupClient())

  it('transfers a triage patient to an available ER bed transactionally', async () => {
    mockDecisionMadeTriageBed()
    queryMock
      .mockResolvedValueOnce({
        rows: [{
          id: ER_BED_ID,
          bedNumber: 'ER-01',
          currentStageId: EMPTY_STAGE_ID,
          currentStageName: 'Empty',
          lastStageChange: new Date('2026-05-21T07:30:00Z'),
          isOccupied: false,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: ER_START_STAGE_ID, name: 'Initial Investigation' }],
      })

    await completeTriageDecisionInDB({
      bedId: TRIAGE_BED_ID,
      outcome: 'shift_to_er',
      erBedId: ER_BED_ID,
      userId: USER_ID,
    })

    const sql = queryMock.mock.calls.map((call) => String(call[0]))
    expect(sql[0]).toBe('BEGIN')
    expect(sql.some((text) => text.includes('FOR UPDATE OF b'))).toBe(true)
    expect(sql.some((text) => text.includes('INSERT INTO triage_decisions'))).toBe(true)
    expect(sql.some((text) => text.includes('INSERT INTO bed_stage_logs'))).toBe(true)
    expect(sql.some((text) => text.includes('INSERT INTO audit_logs'))).toBe(true)
    expect(sql.at(-1)).toBe('COMMIT')

    const erUpdateCall = queryMock.mock.calls.find((call) =>
      String(call[0]).includes('UPDATE beds') && String(call[0]).includes('current_stage_id = $8')
    )
    expect(erUpdateCall?.[1]).toEqual(expect.arrayContaining([ER_START_STAGE_ID, ER_BED_ID]))

    const decisionCall = queryMock.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO triage_decisions')
    )
    expect(decisionCall?.[1]).toEqual(expect.arrayContaining([
      TRIAGE_BED_ID,
      'shift_to_er',
      ER_BED_ID,
      ER_START_STAGE_ID,
      patient.patientUhid,
      USER_ID,
    ]))
    expect(releaseMock).toHaveBeenCalledTimes(1)
  })

  it('rejects occupied ER beds and rolls back without disposition writes', async () => {
    mockDecisionMadeTriageBed()
    queryMock.mockResolvedValueOnce({
      rows: [{
        id: ER_BED_ID,
        bedNumber: 'ER-01',
        currentStageId: EMPTY_STAGE_ID,
        currentStageName: 'Empty',
        lastStageChange: new Date('2026-05-21T07:30:00Z'),
        isOccupied: true,
      }],
    })

    await expect(completeTriageDecisionInDB({
      bedId: TRIAGE_BED_ID,
      outcome: 'shift_to_er',
      erBedId: ER_BED_ID,
      userId: USER_ID,
    })).rejects.toThrow('Selected ER bed is not available.')

    const sql = queryMock.mock.calls.map((call) => String(call[0]))
    expect(sql.some((text) => text.includes('INSERT INTO triage_decisions'))).toBe(false)
    expect(sql.some((text) => text.includes('INSERT INTO bed_stage_logs'))).toBe(false)
    expect(sql).toContain('ROLLBACK')
  })

  it('records non-ER dispositions without assigning an ER bed', async () => {
    mockDecisionMadeTriageBed()

    await completeTriageDecisionInDB({
      bedId: TRIAGE_BED_ID,
      outcome: 'discharge',
      erBedId: ER_BED_ID,
      userId: USER_ID,
    })

    const sql = queryMock.mock.calls.map((call) => String(call[0]))
    expect(sql.some((text) => text.includes("JOIN wards w ON w.id = b.ward_id AND w.code = 'ER'"))).toBe(false)

    const decisionCall = queryMock.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO triage_decisions')
    )
    expect(decisionCall?.[1]).toEqual(expect.arrayContaining([
      TRIAGE_BED_ID,
      'discharge',
      null,
      null,
      patient.patientUhid,
      USER_ID,
    ]))
    expect(sql.at(-1)).toBe('COMMIT')
  })
})
