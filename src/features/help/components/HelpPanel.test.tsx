import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HelpPanel } from './HelpPanel'
import type { HelpContext } from '@/features/help/types/help'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const MOCK_CONTEXT: HelpContext = {
  routeKey: '/dashboard',
  pageTitle: 'Dashboard Help',
  summary: 'A test summary for the dashboard.',
  tips: [
    { id: 't1', title: 'Tip Alpha', description: 'Description alpha detail' },
    { id: 't2', title: 'Tip Beta', description: 'Description beta detail' },
  ],
  tour: [
    { id: 'tour-1', title: 'Step One', description: 'First tour step', selector: '[data-help-id="dashboard-header"]' },
  ],
}

const BASE_PROPS = {
  isOpen: true,
  search: '',
  context: MOCK_CONTEXT,
  crossPageResults: null,
  onSearchChange: vi.fn(),
  onClose: vi.fn(),
  onStartTour: vi.fn(),
  tourAvailable: true,
}

describe('HelpPanel', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<HelpPanel {...BASE_PROPS} isOpen={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders page title and summary when open', () => {
    render(<HelpPanel {...BASE_PROPS} />)
    expect(screen.getByText('Dashboard Help')).toBeInTheDocument()
    expect(screen.getByText('A test summary for the dashboard.')).toBeInTheDocument()
  })

  it('renders all tips when search is empty', () => {
    render(<HelpPanel {...BASE_PROPS} />)
    expect(screen.getByText('Tip Alpha')).toBeInTheDocument()
    expect(screen.getByText('Tip Beta')).toBeInTheDocument()
  })

  it('filters tips to match search query', () => {
    render(<HelpPanel {...BASE_PROPS} search="alpha" />)
    expect(screen.getByText('Tip Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Tip Beta')).not.toBeInTheDocument()
  })

  it('shows no-match message when search has no results', () => {
    render(<HelpPanel {...BASE_PROPS} search="zzznomatch" />)
    expect(screen.getByText(/no help items matched/i)).toBeInTheDocument()
  })

  it('enables Start Tour button when tourAvailable is true', () => {
    render(<HelpPanel {...BASE_PROPS} tourAvailable={true} />)
    expect(screen.getByRole('button', { name: /start tour/i })).not.toBeDisabled()
  })

  it('disables Start Tour button when tourAvailable is false', () => {
    render(<HelpPanel {...BASE_PROPS} tourAvailable={false} />)
    expect(screen.getByRole('button', { name: /start tour/i })).toBeDisabled()
  })

  it('calls onStartTour when Start Tour button is clicked', () => {
    const onStartTour = vi.fn()
    render(<HelpPanel {...BASE_PROPS} onStartTour={onStartTour} />)
    fireEvent.click(screen.getByRole('button', { name: /start tour/i }))
    expect(onStartTour).toHaveBeenCalledOnce()
  })

  it('calls onClose when dismiss button is clicked', () => {
    const onClose = vi.fn()
    render(<HelpPanel {...BASE_PROPS} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss help panel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows grouped cross-page results when crossPageResults is provided', () => {
    const crossPageResults = [
      {
        pageTitle: 'Admin Help',
        routeKey: '/admin',
        tips: [{ id: 'a1', title: 'Admin Tip', description: 'Relevant admin detail' }],
      },
    ]
    render(<HelpPanel {...BASE_PROPS} crossPageResults={crossPageResults} />)
    expect(screen.getByText('Admin Help')).toBeInTheDocument()
    expect(screen.getByText('Admin Tip')).toBeInTheDocument()
  })

  it('shows no-results message when crossPageResults is an empty array', () => {
    render(<HelpPanel {...BASE_PROPS} crossPageResults={[]} />)
    expect(screen.getByText(/no results found across all pages/i)).toBeInTheDocument()
  })

  it('renders a link to the user manual', () => {
    render(<HelpPanel {...BASE_PROPS} />)
    expect(screen.getByRole('link', { name: /open full user manual/i })).toBeInTheDocument()
  })
})
