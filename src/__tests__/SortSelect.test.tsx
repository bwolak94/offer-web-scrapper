import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { SortSelect } from '@/components/filters/SortSelect'

describe('SortSelect', () => {
  const options = ['score_desc', 'price_asc', 'date_desc']

  it('renders Sort label text', () => {
    render(<SortSelect value="score_desc" onChange={vi.fn()} options={options} />)
    // The <Label> element always renders "Sort"
    expect(screen.getByText('Sort')).toBeInTheDocument()
  })

  it('renders the trigger button', () => {
    render(<SortSelect value="score_desc" onChange={vi.fn()} options={options} />)
    // @base-ui/react/select renders a <button> for the trigger
    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeInTheDocument()
  })

  it('renders Sort label when value is date_desc', () => {
    render(<SortSelect value="date_desc" onChange={vi.fn()} options={options} />)
    expect(screen.getByText('Sort')).toBeInTheDocument()
  })
})
