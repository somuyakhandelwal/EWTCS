// US-10.6: HeatmapCell component tests (AC2: color intensity, AC3: interactive)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HeatmapCell } from '../components/HeatmapCell'

vi.mock('@/shared/lib/utils', () => ({
  cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
}))

describe('HeatmapCell — AC2: Color intensity', () => {
  it('renders with zero-volume class when count is 0', () => {
    render(<HeatmapCell count={0} maxCount={10} label="Mon 08:00" onClick={vi.fn()} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-zinc-900')
  })

  it('renders with high-intensity class when count equals maxCount', () => {
    render(<HeatmapCell count={10} maxCount={10} label="Mon 09:00" onClick={vi.fn()} />)
    const btn = screen.getByRole('button')
    // intensity = 1.0 → highest blue class
    expect(btn.className).toContain('bg-blue-400')
  })

  it('renders with mid-intensity class for ~50% fill', () => {
    render(<HeatmapCell count={5} maxCount={10} label="Mon 10:00" onClick={vi.fn()} />)
    const btn = screen.getByRole('button')
    // intensity = 0.5 → bg-blue-700 (0.45 < 0.5 <= 0.60)
    expect(btn.className).toContain('bg-blue-700')
  })

  it('shows count number when count > 0', () => {
    render(<HeatmapCell count={7} maxCount={10} label="Mon 11:00" onClick={vi.fn()} />)
    expect(screen.getByText('7')).toBeDefined()
  })

  it('displays no count text when count is 0', () => {
    render(<HeatmapCell count={0} maxCount={10} label="Mon 12:00" onClick={vi.fn()} />)
    expect(screen.queryByText('0')).toBeNull()
  })
})

describe('HeatmapCell — AC3: Interactive', () => {
  it('calls onClick when cell is clicked', () => {
    const onClick = vi.fn()
    render(<HeatmapCell count={3} maxCount={10} label="Tue 14:00" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('has accessible title with count and label', () => {
    render(<HeatmapCell count={4} maxCount={10} label="Wed 15:00" onClick={vi.fn()} />)
    const btn = screen.getByRole('button')
    expect(btn.getAttribute('title')).toBe('Wed 15:00: 4 admissions')
  })

  it('has accessible aria-label for drill-down intent', () => {
    render(<HeatmapCell count={1} maxCount={10} label="Thu 06:00" onClick={vi.fn()} />)
    const btn = screen.getByRole('button')
    expect(btn.getAttribute('aria-label')).toContain('click to drill down')
  })

  it('uses singular "admission" when count is 1', () => {
    render(<HeatmapCell count={1} maxCount={10} label="Fri 07:00" onClick={vi.fn()} />)
    const btn = screen.getByRole('button')
    expect(btn.getAttribute('title')).toBe('Fri 07:00: 1 admission')
  })

  it('handles maxCount=0 gracefully without division by zero', () => {
    expect(() =>
      render(<HeatmapCell count={0} maxCount={0} label="Sat 00:00" onClick={vi.fn()} />)
    ).not.toThrow()
  })
})

describe('HeatmapCell — intensity scale boundaries', () => {
  const cases: Array<{ count: number; max: number; expected: string }> = [
    { count: 0,  max: 100, expected: 'bg-zinc-900' },
    { count: 10, max: 100, expected: 'bg-blue-950' },  // 0.10 ≤ 0.15
    { count: 20, max: 100, expected: 'bg-blue-900' },  // 0.20 ≤ 0.30
    { count: 40, max: 100, expected: 'bg-blue-800' },  // 0.40 ≤ 0.45
    { count: 55, max: 100, expected: 'bg-blue-700' },  // 0.55 ≤ 0.60
    { count: 70, max: 100, expected: 'bg-blue-600' },  // 0.70 ≤ 0.75
    { count: 85, max: 100, expected: 'bg-blue-500' },  // 0.85 ≤ 0.90
    { count: 95, max: 100, expected: 'bg-blue-400' },  // 0.95 > 0.90
  ]

  cases.forEach(({ count, max, expected }) => {
    it(`intensity ${count}/${max} → ${expected}`, () => {
      const { container } = render(
        <HeatmapCell count={count} maxCount={max} label="test" onClick={vi.fn()} />
      )
      expect(container.querySelector('button')?.className).toContain(expected)
    })
  })
})
