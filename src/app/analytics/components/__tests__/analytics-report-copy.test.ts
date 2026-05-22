import { describe, expect, it } from 'vitest'
import {
  ANALYTICS_PAGE_DESCRIPTION,
  ANALYTICS_PAGE_TITLE,
  ANALYTICS_REPORT_TITLE,
  FULL_REPORT_SECTIONS,
} from '../analytics-report-copy'

describe('analytics-report-copy', () => {
  it('uses the corrected workflow titles for analytics and exports', () => {
    expect(ANALYTICS_REPORT_TITLE).toBe('Emergency Ward and Triage Analytics Report')
    expect(ANALYTICS_PAGE_TITLE).toBe('Emergency Ward and Triage Analytics')
    expect(ANALYTICS_PAGE_DESCRIPTION).toContain('ER workflow')
    expect(FULL_REPORT_SECTIONS).toContainEqual({
      exportId: 'export-stage-analytics',
      title: 'Workflow Analytics by Area',
    })
    expect(FULL_REPORT_SECTIONS).toContainEqual({
      exportId: 'export-tat',
      title: 'Legacy Bed-to-Bed Turnaround (Historical)',
    })
  })
})
