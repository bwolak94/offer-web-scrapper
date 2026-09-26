import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

// Mock base-ui components that don't render properly in jsdom
vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, indicatorClassName }: { value?: number; indicatorClassName?: string }) => (
    <div data-testid="progress" data-value={value} data-indicator-class={indicatorClassName} />
  ),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}))

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}))

import { ScoreBadge } from '@/components/ui/ScoreBadge'

describe('ScoreBadge', () => {
  it('renders a skeleton when score is null', () => {
    render(<ScoreBadge score={null} />)
    expect(screen.getByTestId('skeleton')).toBeDefined()
    expect(screen.queryByTestId('progress')).toBeNull()
  })

  it('renders progress bar (not skeleton) when score is provided', () => {
    render(<ScoreBadge score={75} />)
    expect(screen.getByTestId('progress')).toBeDefined()
    expect(screen.queryByTestId('skeleton')).toBeNull()
  })

  it('passes green indicator class when score >= 70', () => {
    render(<ScoreBadge score={70} />)
    expect(screen.getByTestId('progress').getAttribute('data-indicator-class')).toContain('bg-green-500')
  })

  it('passes green indicator class when score = 100', () => {
    render(<ScoreBadge score={100} />)
    expect(screen.getByTestId('progress').getAttribute('data-indicator-class')).toContain('bg-green-500')
  })

  it('passes yellow indicator class when score >= 40 and < 70', () => {
    render(<ScoreBadge score={55} />)
    expect(screen.getByTestId('progress').getAttribute('data-indicator-class')).toContain('bg-yellow-500')
  })

  it('passes yellow indicator class when score = 40', () => {
    render(<ScoreBadge score={40} />)
    expect(screen.getByTestId('progress').getAttribute('data-indicator-class')).toContain('bg-yellow-500')
  })

  it('passes red indicator class when score < 40', () => {
    render(<ScoreBadge score={39} />)
    expect(screen.getByTestId('progress').getAttribute('data-indicator-class')).toContain('bg-red-500')
  })

  it('passes red indicator class when score = 0', () => {
    render(<ScoreBadge score={0} />)
    expect(screen.getByTestId('progress').getAttribute('data-indicator-class')).toContain('bg-red-500')
  })

  it('renders label text "{score}/100" when showLabel=true and score provided', () => {
    render(<ScoreBadge score={82} showLabel />)
    expect(screen.getByText('82/100')).toBeDefined()
  })

  it('renders "Scoring…" when showLabel=true and score is null', () => {
    render(<ScoreBadge score={null} showLabel />)
    expect(screen.getByText('Scoring…')).toBeDefined()
  })

  it('does not render label text when showLabel=false (default)', () => {
    render(<ScoreBadge score={82} />)
    expect(screen.queryByText('82/100')).toBeNull()
  })

  it('wraps with tooltip trigger when reason is provided', () => {
    render(<ScoreBadge score={75} reason="Good match" />)
    expect(screen.getByTestId('tooltip-trigger')).toBeDefined()
  })

  it('does not render tooltip trigger when reason is not provided', () => {
    render(<ScoreBadge score={75} />)
    expect(screen.queryByTestId('tooltip-trigger')).toBeNull()
  })
})
