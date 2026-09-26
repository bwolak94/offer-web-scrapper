import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'

// ─── Mock ScorePreviewResult ───────────────────────────────────────────────────
// Must be declared before the component import so Vitest can hoist it.
vi.mock('@/components/watches/ScorePreviewResult', () => ({
  ScorePreviewResult: ({
    criteria,
    watchType,
  }: {
    criteria: string
    watchType: string
  }) => (
    <div
      data-testid="score-preview-result"
      data-criteria={criteria}
      data-watch-type={watchType}
    />
  ),
}))

// ─── Mock shadcn Button ────────────────────────────────────────────────────────
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
  }) => (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

import { ScorePreviewButton } from '@/components/watches/ScorePreviewButton'

describe('ScorePreviewButton', () => {
  it('renders a "Preview Score" button', () => {
    render(<ScorePreviewButton criteria="some criteria" watchType="listing" />)
    expect(screen.getByRole('button', { name: /Preview Score/i })).toBeDefined()
  })

  it('button is disabled when criteria is an empty string', () => {
    render(<ScorePreviewButton criteria="" watchType="listing" />)
    const btn = screen.getByRole('button', { name: /Preview Score/i })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('button is disabled when criteria is only whitespace', () => {
    render(<ScorePreviewButton criteria="   " watchType="listing" />)
    const btn = screen.getByRole('button', { name: /Preview Score/i })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('button is enabled when criteria has non-whitespace text', () => {
    render(<ScorePreviewButton criteria="apartment in Mokotów" watchType="listing" />)
    const btn = screen.getByRole('button', { name: /Preview Score/i })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('button is enabled with minimal single non-whitespace character', () => {
    render(<ScorePreviewButton criteria="x" watchType="job" />)
    const btn = screen.getByRole('button', { name: /Preview Score/i })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('ScorePreviewResult is NOT rendered before the button is clicked', () => {
    render(<ScorePreviewButton criteria="some criteria" watchType="listing" />)
    expect(screen.queryByTestId('score-preview-result')).toBeNull()
  })

  it('ScorePreviewResult IS rendered after the button is clicked', async () => {
    const user = userEvent.setup()

    render(<ScorePreviewButton criteria="some criteria" watchType="listing" />)

    const btn = screen.getByRole('button', { name: /Preview Score/i })
    await user.click(btn)

    expect(screen.getByTestId('score-preview-result')).toBeDefined()
  })

  it('passes the correct criteria prop to ScorePreviewResult after click', async () => {
    const user = userEvent.setup()
    const testCriteria = 'Apartment near park, 3 rooms'

    render(<ScorePreviewButton criteria={testCriteria} watchType="listing" />)

    await user.click(screen.getByRole('button', { name: /Preview Score/i }))

    const resultEl = screen.getByTestId('score-preview-result')
    expect(resultEl.getAttribute('data-criteria')).toBe(testCriteria)
  })

  it('passes the correct watchType prop to ScorePreviewResult after click', async () => {
    const user = userEvent.setup()

    render(<ScorePreviewButton criteria="React developer remote" watchType="job" />)

    await user.click(screen.getByRole('button', { name: /Preview Score/i }))

    const resultEl = screen.getByTestId('score-preview-result')
    expect(resultEl.getAttribute('data-watch-type')).toBe('job')
  })

  it('passes watchType "listing" correctly to ScorePreviewResult', async () => {
    const user = userEvent.setup()

    render(<ScorePreviewButton criteria="Studio in Śródmieście" watchType="listing" />)

    await user.click(screen.getByRole('button', { name: /Preview Score/i }))

    const resultEl = screen.getByTestId('score-preview-result')
    expect(resultEl.getAttribute('data-watch-type')).toBe('listing')
  })

  it('ScorePreviewResult remains visible after subsequent renders (state persists)', async () => {
    const user = userEvent.setup()

    const { rerender } = render(
      <ScorePreviewButton criteria="initial criteria" watchType="listing" />,
    )

    await user.click(screen.getByRole('button', { name: /Preview Score/i }))
    expect(screen.getByTestId('score-preview-result')).toBeDefined()

    // Re-render with updated criteria — showPreview state should remain true
    rerender(<ScorePreviewButton criteria="updated criteria" watchType="listing" />)
    expect(screen.getByTestId('score-preview-result')).toBeDefined()
  })

  it('clicking button more than once does not cause errors', async () => {
    const user = userEvent.setup()

    render(<ScorePreviewButton criteria="some criteria" watchType="job" />)

    const btn = screen.getByRole('button', { name: /Preview Score/i })
    await user.click(btn)
    await user.click(btn)

    // ScorePreviewResult should still be rendered (only one instance)
    expect(screen.getAllByTestId('score-preview-result')).toHaveLength(1)
  })
})
