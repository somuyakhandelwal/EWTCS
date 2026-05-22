import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DailySummaryCard } from '../DailySummaryCard'
import type { DailySummary } from '../../types/daily-summary'

const baseSummary: DailySummary = {
  id: 'summary-1',
  summaryDate: '2026-05-22',
  totalPatients: 10,
  avgStageTimeMinutes: 8,
  delayCount: 2,
  avgTatMinutes: 22,
  totalBedsUsed: 7,
  totalStageUpdates: 30,
  generatedAt: '2026-05-22T00:30:00.000Z',
  aiSummary: 'Workflow summary text.',
  status: 'draft',
  aiInsights: [],
  metadata: {},
}

describe('DailySummaryCard', () => {
  it('prioritizes ER and triage TAT labels when split workflow metrics exist', () => {
    render(
      <DailySummaryCard
        summary={{
          ...baseSummary,
          metadata: {
            avgErTatMinutes: 30,
            avgTriageTatMinutes: 14,
          },
        }}
      />
    )

    expect(screen.getByText('Avg ER TAT')).toBeDefined()
    expect(screen.getByText('Avg Triage TAT')).toBeDefined()
    expect(screen.getByText('Combined Workflow TAT')).toBeDefined()
    expect(screen.queryByText('Avg Workflow TAT')).toBeNull()
  })

  it('falls back to generic workflow TAT label when split metrics are unavailable', () => {
    render(<DailySummaryCard summary={baseSummary} />)

    expect(screen.getByText('Avg Workflow TAT')).toBeDefined()
    expect(screen.queryByText('Combined Workflow TAT')).toBeNull()
  })
})
