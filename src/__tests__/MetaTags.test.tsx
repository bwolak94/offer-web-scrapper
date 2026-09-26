import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MetaTags } from '@/components/ui/MetaTags'

describe('MetaTags', () => {
  it('returns null when items array is empty', () => {
    const { container } = render(<MetaTags items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all item labels', () => {
    const items = [
      { icon: <span>A</span>, label: 'First label' },
      { icon: <span>B</span>, label: 'Second label' },
      { icon: <span>C</span>, label: 'Third label' },
    ]
    render(<MetaTags items={items} />)
    expect(screen.getByText('First label')).toBeDefined()
    expect(screen.getByText('Second label')).toBeDefined()
    expect(screen.getByText('Third label')).toBeDefined()
  })

  it('renders exactly 3 items correctly', () => {
    const items = [
      { icon: null, label: 'Label 1' },
      { icon: null, label: 'Label 2' },
      { icon: null, label: 'Label 3' },
    ]
    const { container } = render(<MetaTags items={items} />)
    const spans = container.querySelectorAll('span')
    // Each item is wrapped in a span
    expect(spans.length).toBe(3)
  })

  it('renders a single item', () => {
    render(<MetaTags items={[{ icon: <span>icon</span>, label: 'Warsaw' }]} />)
    expect(screen.getByText('Warsaw')).toBeDefined()
  })
})
