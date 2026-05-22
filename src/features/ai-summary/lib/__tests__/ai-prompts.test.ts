import { describe, expect, it } from 'vitest'
import { buildSummaryPrompt } from '../ai-prompts'

describe('buildSummaryPrompt', () => {
  it('describes ER and triage workflow metrics separately', () => {
    const prompt = buildSummaryPrompt({
      summaryDate: '2026-05-22',
      totalPatients: 18,
      avgStageTimeMinutes: 12,
      delayCount: 3,
      avgTatMinutes: 28,
      totalBedsUsed: 14,
      totalStageUpdates: 74,
      metadata: {
        avgErTatMinutes: 35,
        avgTriageTatMinutes: 16,
        mostDelayedStage: 'Discharge',
      },
    })

    expect(prompt).toContain('Combined Workflow TAT Across Areas: 28 minutes')
    expect(prompt).toContain('Average ER Workflow TAT: 35 minutes')
    expect(prompt).toContain('Average Triage Workflow TAT: 16 minutes')
    expect(prompt).toContain('Triage is its own area, not an ER stage')
    expect(prompt).not.toContain('Average Turnaround Time (TAT):')
  })
})
