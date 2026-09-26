import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { ScoreMinSlider } from '@/components/filters/ScoreMinSlider'

describe('ScoreMinSlider', () => {
  it('displays current value in label', () => {
    render(<ScoreMinSlider value={42} onChange={vi.fn()} />)
    expect(screen.getByText(/42/)).toBeInTheDocument()
  })

  it('displays 0 when value is 0', () => {
    render(<ScoreMinSlider value={0} onChange={vi.fn()} />)
    expect(screen.getByText(/Min score: 0/)).toBeInTheDocument()
  })
})
