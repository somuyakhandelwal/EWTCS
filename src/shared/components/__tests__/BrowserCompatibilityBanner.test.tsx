import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserCompatibilityBanner } from '../BrowserCompatibilityBanner'

vi.mock('@/shared/lib/browser-compat', () => ({
  detectBrowserCompatibilityOnClient: vi.fn(),
}))

const { detectBrowserCompatibilityOnClient } = await import('@/shared/lib/browser-compat')

describe('BrowserCompatibilityBanner', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('does not render for supported browsers', () => {
    vi.mocked(detectBrowserCompatibilityOnClient).mockReturnValue({
      family: 'chrome',
      majorVersion: 124,
      tier: 'supported',
      missingFeatures: [],
      reason: 'Fully supported browser version.',
    })

    render(<BrowserCompatibilityBanner />)
    expect(screen.queryByTestId('browser-compatibility-banner')).toBeNull()
  })

  it('renders warning for unsupported browsers', async () => {
    vi.mocked(detectBrowserCompatibilityOnClient).mockReturnValue({
      family: 'unknown',
      majorVersion: null,
      tier: 'unsupported',
      missingFeatures: ['fetch'],
      reason: 'Missing required browser APIs: fetch',
    })

    render(<BrowserCompatibilityBanner />)
    expect(await screen.findByTestId('browser-compatibility-banner')).toBeInTheDocument()
    expect(screen.getByText(/Unsupported browser detected/i)).toBeInTheDocument()
  })

  it('dismisses banner for current browser signature', async () => {
    vi.mocked(detectBrowserCompatibilityOnClient).mockReturnValue({
      family: 'safari',
      majorVersion: 16,
      tier: 'limited',
      missingFeatures: [],
      reason: 'Older browser in limited mode.',
    })

    render(<BrowserCompatibilityBanner />)
    const dismissButton = await screen.findByRole('button', { name: /dismiss/i })
    fireEvent.click(dismissButton)

    expect(screen.queryByTestId('browser-compatibility-banner')).toBeNull()
    expect(sessionStorage.getItem('ewtcs:browser-compat-dismissed')).toBe('safari-16-limited')
  })
})
