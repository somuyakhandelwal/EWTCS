import { describe, expect, it } from 'vitest'
import {
  normalizeWorkflowInsights,
  normalizeWorkflowSummaryText,
} from '../workflow-summary-normalizer'

describe('workflow-summary-normalizer', () => {
  it('replaces legacy triage-as-stage phrases in narrative text', () => {
    const normalized = normalizeWorkflowSummaryText(
      'The triage stage remained congested and emergency ward triage delayed care.'
    )

    expect(normalized).toBe(
      'The triage area remained congested and triage area delayed care.'
    )
  })

  it('replaces legacy triage phrases inside insights', () => {
    const normalized = normalizeWorkflowInsights([
      { id: 'i1', text: 'Triage stages were slower than expected.', confidence: 75 },
    ])

    expect(normalized[0].text).toBe('triage workflow states were slower than expected.')
  })
})
