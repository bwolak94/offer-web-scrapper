import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

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
  it('renders spinning SVG when score is null', () => {
    render(<ScoreBadge score={null} />)
    expect(screen.getByLabelText('Scoring in progress')).toBeDefined()
    expect(screen.queryByLabelText(/^Score:/)).toBeNull()
  })

  it('renders score arc (not spinner) when score is provided', () => {
    render(<ScoreBadge score={75} />)
    expect(screen.getByLabelText('Score: 75')).toBeDefined()
    expect(screen.queryByLabelText('Scoring in progress')).toBeNull()
  })

  it('uses score-high color when score >= 70', () => {
    render(<ScoreBadge score={70} />)
    const span = screen.getByLabelText('Score: 70') as HTMLElement
    expect(span.style.color).toBe('var(--color-score-high)')
  })

  it('uses score-high color when score = 100', () => {
    render(<ScoreBadge score={100} />)
    const span = screen.getByLabelText('Score: 100') as HTMLElement
    expect(span.style.color).toBe('var(--color-score-high)')
  })

  it('uses score-mid color when score >= 40 and < 70', () => {
    render(<ScoreBadge score={55} />)
    const span = screen.getByLabelText('Score: 55') as HTMLElement
    expect(span.style.color).toBe('var(--color-score-mid)')
  })

  it('uses score-mid color when score = 40', () => {
    render(<ScoreBadge score={40} />)
    const span = screen.getByLabelText('Score: 40') as HTMLElement
    expect(span.style.color).toBe('var(--color-score-mid)')
  })

  it('uses score-low color when score < 40', () => {
    render(<ScoreBadge score={39} />)
    const span = screen.getByLabelText('Score: 39') as HTMLElement
    expect(span.style.color).toBe('var(--color-score-low)')
  })

  it('uses score-low color when score = 0', () => {
    render(<ScoreBadge score={0} />)
    const span = screen.getByLabelText('Score: 0') as HTMLElement
    expect(span.style.color).toBe('var(--color-score-low)')
  })

  it('shows "AI score" label when showLabel=true, size="lg", and score is provided', () => {
    render(<ScoreBadge score={82} showLabel size="lg" />)
    expect(screen.getByText('AI score')).toBeDefined()
  })

  it('does not show label text when showLabel=true and score is null', () => {
    render(<ScoreBadge score={null} showLabel />)
    expect(screen.queryByText('AI score')).toBeNull()
  })

  it('does not show "AI score" label when showLabel=false (default)', () => {
    render(<ScoreBadge score={82} />)
    expect(screen.queryByText('AI score')).toBeNull()
  })

  it('does not show score number when size="sm"', () => {
    render(<ScoreBadge score={75} size="sm" />)
    expect(screen.queryByLabelText('Score: 75')).toBeNull()
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
