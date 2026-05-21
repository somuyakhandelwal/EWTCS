import { describe, expect, it, vi } from 'vitest'
import { resolveErStartingStage } from '../decision-helpers'

describe('triage decision helpers', () => {
  it('resolves the active U.S 25.2 ER starting stage', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ id: 'stage-initial-investigation', name: 'Initial Investigation' }],
    })

    const result = await resolveErStartingStage({ query } as never)

    expect(result).toEqual({ id: 'stage-initial-investigation', name: 'Initial Investigation' })
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("WHEN 'initial investigation' THEN 1"),
      [['initial investigation', 'initial treatment', 'drugs/test']]
    )
  })
})
