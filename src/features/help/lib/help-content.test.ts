import { describe, expect, it } from 'vitest'
import { getHelpContextByPath } from './help-content'

describe('getHelpContextByPath', () => {
  it('returns specific admin sub-route context before generic admin context', () => {
    const context = getHelpContextByPath('/admin/beds')
    expect(context.routeKey).toBe('/admin/beds')
    expect(context.pageTitle).toContain('Bed Management')
  })

  it('returns analytics context for analytics route', () => {
    const context = getHelpContextByPath('/analytics')
    expect(context.routeKey).toBe('/analytics')
    expect(context.tour.length).toBeGreaterThan(0)
  })

  it('returns default context for unknown routes', () => {
    const context = getHelpContextByPath('/unknown-route')
    expect(context.routeKey).toBe('default')
  })
})
