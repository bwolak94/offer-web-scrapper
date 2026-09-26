import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PriceTag } from '@/components/ui/PriceTag'

describe('PriceTag', () => {
  it('renders "Price on request" when price is null', () => {
    render(<PriceTag price={null} />)
    expect(screen.getByText('Price on request')).toBeDefined()
  })

  it('formats price with Polish locale and currency', () => {
    render(<PriceTag price={500000} currency="PLN" />)
    // Polish locale: 500 000 PLN (non-breaking space between thousands)
    const el = screen.getByText(/500.*000.*PLN/)
    expect(el).toBeDefined()
  })

  it('uses PLN as default currency when not specified', () => {
    render(<PriceTag price={300000} />)
    const el = screen.getByText(/PLN/)
    expect(el).toBeDefined()
  })

  it('renders per-m² line when perM2=true and areaM2 is valid', () => {
    render(<PriceTag price={500000} currency="PLN" perM2 areaM2={50} />)
    // 500000 / 50 = 10000 → "10 000 PLN/m²"
    const el = screen.getByText(/10.*000.*PLN\/m²/)
    expect(el).toBeDefined()
  })

  it('does not render per-m² line when areaM2 is null', () => {
    render(<PriceTag price={500000} currency="PLN" perM2 areaM2={null} />)
    expect(screen.queryByText(/\/m²/)).toBeNull()
  })

  it('does not render per-m² line when areaM2 is 0 (division by zero guard)', () => {
    render(<PriceTag price={500000} currency="PLN" perM2 areaM2={0} />)
    expect(screen.queryByText(/\/m²/)).toBeNull()
  })

  it('does not render per-m² line when perM2=false even with valid areaM2', () => {
    render(<PriceTag price={500000} currency="PLN" perM2={false} areaM2={50} />)
    expect(screen.queryByText(/\/m²/)).toBeNull()
  })
})
