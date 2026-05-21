import { describe, expect, it } from 'vitest'
import {
  TRIAGE_STATES,
  type TriageState,
} from '../types'
import {
  getAllowedTriageTransitions,
  isErOnlyStateName,
  validateTriageTransition,
} from '../state'

describe('triage state model', () => {
  it('exposes only the four approved triage states', () => {
    expect(TRIAGE_STATES).toEqual([
      'empty',
      'initial_treatment',
      'decision_made',
      'cleaning',
    ])
  })

  it('allows only the approved triage transition path', () => {
    const validPairs: Array<[TriageState, TriageState]> = [
      ['empty', 'initial_treatment'],
      ['initial_treatment', 'decision_made'],
      ['decision_made', 'cleaning'],
      ['cleaning', 'empty'],
    ]

    for (const [fromState, toState] of validPairs) {
      expect(validateTriageTransition(fromState, toState)).toEqual({ success: true })
    }
  })

  it('rejects invalid skips and reverse moves', () => {
    expect(validateTriageTransition('empty', 'decision_made').success).toBe(false)
    expect(validateTriageTransition('decision_made', 'initial_treatment').success).toBe(false)
    expect(validateTriageTransition('initial_treatment', 'cleaning').success).toBe(false)
  })

  it('keeps assignment and cleaning completion tied to their source states', () => {
    expect(getAllowedTriageTransitions('empty')).toEqual(['initial_treatment'])
    expect(getAllowedTriageTransitions('cleaning')).toEqual(['empty'])
  })

  it('identifies ER-only state names as forbidden in triage', () => {
    expect(isErOnlyStateName('Initial Investigation')).toBe(true)
    expect(isErOnlyStateName('Drugs/Test')).toBe(true)
    expect(isErOnlyStateName('Observation')).toBe(true)
    expect(isErOnlyStateName('Discharge Process')).toBe(true)
  })
})
