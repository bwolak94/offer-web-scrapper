import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SalaryRange } from '@/components/ui/SalaryRange'

describe('SalaryRange', () => {
  it('renders "Undisclosed" when both min and max are null', () => {
    render(<SalaryRange min={null} max={null} currency="PLN" />)
    expect(screen.getByText('Undisclosed')).toBeDefined()
  })

  it('renders full range when both min and max are provided', () => {
    render(<SalaryRange min={5000} max={10000} currency="PLN" />)
    // Polish locale: "5 000 – 10 000 PLN"
    const el = screen.getByText(/5.*000.*–.*10.*000.*PLN/)
    expect(el).toBeDefined()
  })

  it('renders "from X PLN" when only min is provided', () => {
    render(<SalaryRange min={5000} max={null} currency="PLN" />)
    const el = screen.getByText(/from.*5.*000.*PLN/)
    expect(el).toBeDefined()
  })

  it('renders "up to X PLN" when only max is provided', () => {
    render(<SalaryRange min={null} max={10000} currency="PLN" />)
    const el = screen.getByText(/up to.*10.*000.*PLN/)
    expect(el).toBeDefined()
  })
})
