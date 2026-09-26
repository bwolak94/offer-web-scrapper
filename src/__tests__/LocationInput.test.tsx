import { render, screen, act, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { LocationInput } from '@/components/filters/LocationInput'

describe('LocationInput', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('renders input with current value', () => {
    render(<LocationInput value="Warszawa" onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Warszawa')).toBeInTheDocument()
  })

  it('does not call onChange immediately on type', () => {
    const onChange = vi.fn()
    render(<LocationInput value="" onChange={onChange} />)
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'K' } })
    // Debounce timer has not been advanced — onChange must not be called yet.
    expect(onChange).not.toHaveBeenCalled()
  })

  it('calls onChange after 300ms debounce', () => {
    const onChange = vi.fn()
    render(<LocationInput value="" onChange={onChange} />)
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'Kraków' } })
    act(() => { vi.advanceTimersByTime(300) })

    expect(onChange).toHaveBeenCalledWith('Kraków')
  })

  it('syncs local state when external value changes', () => {
    const { rerender } = render(<LocationInput value="Warszawa" onChange={vi.fn()} />)
    rerender(<LocationInput value="Gdańsk" onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Gdańsk')).toBeInTheDocument()
  })
})
