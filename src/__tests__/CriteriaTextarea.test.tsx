import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

// Mock the shadcn Textarea to a plain <textarea> so jsdom renders it
// and we can inspect HTML attributes directly.
vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
    maxLength,
    rows,
    placeholder,
    className,
  }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
      value={value}
      onChange={onChange}
      maxLength={maxLength}
      rows={rows}
      placeholder={placeholder}
      className={className}
      data-testid="criteria-textarea"
    />
  ),
}))

import { CriteriaTextarea } from '@/components/watches/CriteriaTextarea'

describe('CriteriaTextarea', () => {
  // ── Security: maxLength enforcement ──────────────────────────────────────
  it('sets maxLength=500 on the textarea element by default', () => {
    render(<CriteriaTextarea value="" onChange={() => {}} />)
    const textarea = screen.getByTestId('criteria-textarea')
    expect(textarea.getAttribute('maxlength')).toBe('500')
  })

  it('reflects a custom maxLength prop on the textarea element', () => {
    render(<CriteriaTextarea value="" onChange={() => {}} maxLength={200} />)
    const textarea = screen.getByTestId('criteria-textarea')
    expect(textarea.getAttribute('maxlength')).toBe('200')
  })

  // ── Security: XSS — content rendered as text, not HTML ───────────────────
  it('renders a malicious criteria string as plain text, not as HTML', () => {
    const xssPayload = '<script>alert("xss")</script>'
    const { container } = render(
      <CriteriaTextarea value={xssPayload} onChange={() => {}} />,
    )
    // The container must NOT contain an actual <script> element.
    expect(container.querySelector('script')).toBeNull()
    // The textarea value is set via the DOM property, not innerHTML, so the
    // text is safe. We verify no dangerouslySetInnerHTML path exists by
    // confirming the raw tag does not appear as parsed HTML.
    const textarea = screen.getByTestId('criteria-textarea')
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  // ── Character count display ───────────────────────────────────────────────
  it('shows "0/500" counter when value is empty and maxLength is default', () => {
    render(<CriteriaTextarea value="" onChange={() => {}} />)
    expect(screen.getByText('0/500')).toBeDefined()
  })

  it('shows "10/500" counter when value has 10 characters', () => {
    render(<CriteriaTextarea value="1234567890" onChange={() => {}} />)
    expect(screen.getByText('10/500')).toBeDefined()
  })

  it('shows counter matching custom maxLength', () => {
    render(<CriteriaTextarea value="hello" onChange={() => {}} maxLength={300} />)
    expect(screen.getByText('5/300')).toBeDefined()
  })

  it('shows counter equal to maxLength when value fills the limit', () => {
    const fullValue = 'a'.repeat(500)
    render(<CriteriaTextarea value={fullValue} onChange={() => {}} />)
    expect(screen.getByText('500/500')).toBeDefined()
  })

  // ── onChange callback ─────────────────────────────────────────────────────
  it('calls onChange with the new textarea value when user types', () => {
    const handleChange = vi.fn()
    render(<CriteriaTextarea value="" onChange={handleChange} />)
    const textarea = screen.getByTestId('criteria-textarea')
    fireEvent.change(textarea, { target: { value: 'new value' } })
    expect(handleChange).toHaveBeenCalledOnce()
    expect(handleChange).toHaveBeenCalledWith('new value')
  })

  it('does not call onChange when no interaction occurs', () => {
    const handleChange = vi.fn()
    render(<CriteriaTextarea value="initial" onChange={handleChange} />)
    expect(handleChange).not.toHaveBeenCalled()
  })

  // ── Placeholder text ──────────────────────────────────────────────────────
  it('renders the placeholder text on the textarea element', () => {
    render(<CriteriaTextarea value="" onChange={() => {}} />)
    const textarea = screen.getByTestId('criteria-textarea')
    const placeholder = textarea.getAttribute('placeholder') ?? ''
    expect(placeholder.length).toBeGreaterThan(0)
    // Spot-check for the descriptive hint text present in the component source.
    expect(placeholder).toContain('Describe what you')
  })
})
